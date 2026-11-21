"use client";

import { useEffect, useRef, useState } from "react";
import type { GlobeInstance } from "globe.gl";
import type { ShaderMaterial } from "three";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { PLACES } from "@/data/places";
import { sunPosition } from "@/lib/geo";
import { tempColor } from "@/lib/weather";
import type { CurrentWeather, Place } from "@/lib/types";

export type Layers = { dayNight: boolean; weather: boolean; borders: boolean };
export type FlyTarget = { lat: number; lng: number; altitude?: number; key: number };
type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }>;

type Props = {
  selectedId: string | null;
  highlightIds: Set<string> | null;
  weather: Record<string, CurrentWeather> | undefined;
  layers: Layers;
  flyTo: FlyTarget | null;
  onSelectPlace: (id: string) => void;
  onSelectCountry: (name: string) => void;
};

const VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec2 vUv;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec3 sunDirection;
  uniform float nightEnabled;
  varying vec3 vNormalW;
  varying vec2 vUv;
  void main() {
    float intensity = dot(normalize(vNormalW), normalize(sunDirection));
    vec3 day = texture2D(dayTexture, vUv).rgb;
    vec3 night = texture2D(nightTexture, vUv).rgb;
    // Night side: city lights over a faint, cool-tinted copy of the day texture
    vec3 nightCol = night * 1.25 + day * vec3(0.04, 0.06, 0.1);
    float blend = smoothstep(-0.15, 0.15, intensity);
    // Subtle day-side shading so the globe keeps depth
    vec3 dayCol = day * (0.85 + 0.25 * clamp(intensity, 0.0, 1.0));
    vec3 lit = mix(nightCol, dayCol, blend);
    vec3 flat_ = day * 1.02;
    gl_FragColor = vec4(mix(flat_, lit, nightEnabled), 1.0);
  }
`;

/** Matches three-globe's polar → cartesian conversion so lighting lines up with markers. */
function latLngToVec(lat: number, lng: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;
  return [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
}

function initialLng() {
  // Face the viewer's own side of the planet first.
  return -(new Date().getTimezoneOffset() / 60) * 15;
}

export default function GlobeView(props: Props) {
  const { selectedId, highlightIds, weather, layers, flyTo, onSelectPlace, onSelectCountry } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const markerEls = useRef(new Map<string, HTMLDivElement>());
  const countriesRef = useRef<CountryFeature[]>([]);
  const hoverCountry = useRef<CountryFeature | null>(null);
  const cb = useRef({ onSelectPlace, onSelectCountry });
  cb.current = { onSelectPlace, onSelectCountry };
  const [ready, setReady] = useState(0);
  const layersRef = useRef(layers);
  layersRef.current = layers;

  // ── Create the globe once ──────────────────────────────────────────────
  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;
    let sunTimer: ReturnType<typeof setInterval> | null = null;
    const el = containerRef.current!;
    const markers = markerEls.current;

    (async () => {
      const [{ default: Globe }, THREE, topo] = await Promise.all([
        import("globe.gl"),
        import("three"),
        import("topojson-client"),
      ]);
      if (disposed) return;

      const loader = new THREE.TextureLoader();
      const material = new THREE.ShaderMaterial({
        uniforms: {
          dayTexture: { value: loader.load("/textures/earth-blue-marble.jpg") },
          nightTexture: { value: loader.load("/textures/earth-night.jpg") },
          sunDirection: { value: new THREE.Vector3(...latLngToVec(0, 0)) },
          nightEnabled: { value: layersRef.current.dayNight ? 1 : 0 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
      });
      materialRef.current = material;
      const updateSun = () => {
        const s = sunPosition();
        material.uniforms.sunDirection.value.set(...latLngToVec(s.lat, s.lng));
      };
      updateSun();
      sunTimer = setInterval(updateSun, 60_000);

      const globe = new Globe(el, { animateIn: true })
        .width(el.clientWidth)
        .height(el.clientHeight)
        .backgroundColor("rgba(0,0,0,0)")
        .backgroundImageUrl("/textures/night-sky.png")
        .globeMaterial(material)
        .showAtmosphere(true)
        .atmosphereColor("#5ec8ff")
        .atmosphereAltitude(0.18)
        // Markers (DOM elements → glow, hover and click for free)
        .htmlElementsData(PLACES)
        .htmlLat((d) => (d as Place).lat)
        .htmlLng((d) => (d as Place).lng)
        .htmlAltitude(0.005)
        .htmlTransitionDuration(0)
        .htmlElement((d) => {
          const place = d as Place;
          let node = markers.get(place.id);
          if (!node) {
            node = document.createElement("div");
            node.className = `ge-marker ge-${place.kind}`;
            node.innerHTML = `<span class="ge-pulse"></span><span class="ge-dot"></span><span class="ge-label"><span class="ge-name"></span><span class="ge-temp"></span></span>`;
            (node.querySelector(".ge-name") as HTMLElement).textContent = place.name;
            node.style.pointerEvents = "auto";
            node.title = `${place.name}, ${place.country}`;
            node.addEventListener("click", (ev) => {
              ev.stopPropagation();
              cb.current.onSelectPlace(place.id);
            });
            markers.set(place.id, node);
          }
          return node;
        })
        // Rings for selection / discover matches
        .ringColor(() => (t: number) => `rgba(94,200,255,${Math.max(0, 1 - t) * 0.9})`)
        .ringMaxRadius((d) => ((d as { strong?: boolean }).strong ? 4 : 2.2))
        .ringPropagationSpeed(2.4)
        .ringRepeatPeriod((d) => ((d as { strong?: boolean }).strong ? 900 : 1600))
        .ringAltitude(0.003)
        // Country borders
        .polygonGeoJsonGeometry("geometry")
        .polygonCapColor((d) => (d === hoverCountry.current ? "rgba(94,200,255,0.18)" : "rgba(0,0,0,0)"))
        .polygonSideColor(() => "rgba(0,0,0,0)")
        .polygonStrokeColor(() => "rgba(190,225,255,0.28)")
        .polygonAltitude((d) => (d === hoverCountry.current ? 0.012 : 0.004))
        .polygonsTransitionDuration(200)
        .polygonLabel((d) => `<div class="ge-tooltip">${(d as CountryFeature).properties.name}</div>`)
        .onPolygonHover((d) => {
          hoverCountry.current = (d as CountryFeature) ?? null;
          el.style.cursor = d ? "pointer" : "grab";
          const g = globeRef.current;
          if (g) g.polygonCapColor(g.polygonCapColor()).polygonAltitude(g.polygonAltitude());
        })
        .onPolygonClick((d) => cb.current.onSelectCountry((d as CountryFeature).properties.name))
        .onZoom(({ altitude }) => {
          el.classList.toggle("ge-zoomed", altitude < 0.85);
          el.classList.toggle("ge-far", altitude > 2.4);
        })
        .pointOfView({ lat: 22, lng: initialLng(), altitude: el.clientWidth < 640 ? 3.4 : 2.6 });

      globeRef.current = globe;
      // Marker DOM nodes are created on the globe's next frames; re-sync state once they exist.
      setTimeout(() => !disposed && setReady((r) => r + 1), 300);

      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableDamping = true;
      controls.minDistance = 120;
      controls.maxDistance = 900;
      el.addEventListener("pointerdown", () => (controls.autoRotate = false), { once: true });

      // Country polygons (Natural Earth via world-atlas)
      fetch("/countries-110m.json")
        .then((r) => r.json())
        .then((world) => {
          if (disposed) return;
          const fc = topo.feature(world, world.objects.countries) as unknown as { features: CountryFeature[] };
          countriesRef.current = fc.features.filter((f) => f.properties.name !== "Antarctica");
          if (layersRef.current.borders) globe.polygonsData(countriesRef.current);
        });

      ro = new ResizeObserver(() => globe.width(el.clientWidth).height(el.clientHeight));
      ro.observe(el);
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      if (sunTimer) clearInterval(sunTimer);
      globeRef.current?._destructor();
      globeRef.current = null;
      markers.clear();
      el.innerHTML = "";
    };
  }, []);

  // ── Layers ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (materialRef.current) materialRef.current.uniforms.nightEnabled.value = layers.dayNight ? 1 : 0;
  }, [layers.dayNight, ready]);

  useEffect(() => {
    globeRef.current?.polygonsData(layers.borders ? countriesRef.current : []);
  }, [layers.borders]);

  // Marker state: selection, discover highlights, weather colouring
  useEffect(() => {
    const el = containerRef.current;
    el?.classList.toggle("ge-weather", layers.weather);
    for (const place of PLACES) {
      const node = markerEls.current.get(place.id);
      if (!node) continue;
      node.classList.toggle("selected", place.id === selectedId);
      node.classList.toggle("match", !!highlightIds?.has(place.id));
      node.classList.toggle("dim", !!highlightIds && !highlightIds.has(place.id) && place.id !== selectedId);
      const w = weather?.[place.id];
      const temp = node.querySelector(".ge-temp") as HTMLElement;
      if (layers.weather && w) {
        node.style.setProperty("--marker", tempColor(w.temperature));
        temp.textContent = ` ${Math.round(w.temperature)}°`;
      } else {
        node.style.removeProperty("--marker");
        temp.textContent = "";
      }
    }
  });

  // Rings
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const rings: { lat: number; lng: number; strong?: boolean }[] = [];
    if (highlightIds) for (const p of PLACES) if (highlightIds.has(p.id) && p.id !== selectedId) rings.push({ lat: p.lat, lng: p.lng });
    const sel = PLACES.find((p) => p.id === selectedId);
    if (sel) rings.push({ lat: sel.lat, lng: sel.lng, strong: true });
    g.ringsData(rings);
  }, [selectedId, highlightIds, ready]);

  // Camera
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !flyTo) return;
    g.controls().autoRotate = false;
    g.pointOfView({ lat: flyTo.lat, lng: flyTo.lng, altitude: flyTo.altitude ?? 1.1 }, 1600);
  }, [flyTo]);

  return <div ref={containerRef} className="ge-globe absolute inset-0 isolate z-0" />;
}
