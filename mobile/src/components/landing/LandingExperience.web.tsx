import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WaterMesh } from 'three/addons/objects/Water2Mesh.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

type Props = {
  onEnter: () => void;
};

export function LandingExperience({ onEnter }: Props) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const touchTimeRef = useRef(0);
  const [activeTagline, setActiveTagline] = useState(0);
  const [exitTagline, setExitTagline] = useState(-1);

  const taglines = [
    'Elevate your everyday.',
    'The art of living well.',
    'Intentional living, curated.',
  ];

  useEffect(() => {
    let exitCleanupTimeoutId: number | undefined;

    const intervalId = window.setInterval(() => {
      setActiveTagline((prev) => {
        setExitTagline(prev);
        return (prev + 1) % taglines.length;
      });

      if (exitCleanupTimeoutId) {
        window.clearTimeout(exitCleanupTimeoutId);
      }
      exitCleanupTimeoutId = window.setTimeout(() => {
        setExitTagline(-1);
      }, 950);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
      if (exitCleanupTimeoutId) {
        window.clearTimeout(exitCleanupTimeoutId);
      }
    };
  }, [taglines.length]);

  useEffect(() => {
    let camera: THREE.PerspectiveCamera | undefined;
    let scene: THREE.Scene | undefined;
    let renderer: THREE.WebGPURenderer | undefined;
    let controls: OrbitControls | undefined;
    let water: any;
    let envMap: THREE.Texture | undefined;
    let normal0: THREE.Texture | undefined;
    let normal1: THREE.Texture | undefined;

    const host = canvasHostRef.current;
    if (!host) {
      return;
    }

    const onResize = () => {
      if (!camera || !renderer) {
        return;
      }
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const init = async () => {
      try {
        scene = new THREE.Scene();

        renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        host.appendChild(renderer.domElement);

        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
        camera.position.set(0, 1.5, 8);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.maxDistance = camera.far / 2;
        controls.minDistance = 2;
        controls.maxPolarAngle = THREE.MathUtils.degToRad(90);
        controls.target.set(0, 1, 0);
        controls.update();

        window.addEventListener('resize', onResize);

        const hdrLoader = new HDRLoader();
        envMap = await hdrLoader.loadAsync('https://happy358.github.io/Images/HDR/old_hall_2k.hdr');
        envMap.mapping = THREE.EquirectangularReflectionMapping;

        const skybox = new GroundedSkybox(envMap, 15, camera.far / 2);
        skybox.position.y = 14;
        scene.add(skybox);

        const textureLoader = new THREE.TextureLoader();
        [normal0, normal1] = await Promise.all([
          textureLoader.loadAsync('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/water/Water_1_M_Normal.jpg'),
          textureLoader.loadAsync('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/water/Water_2_M_Normal.jpg'),
        ]);
        normal0.wrapS = normal0.wrapT = THREE.RepeatWrapping;
        normal1.wrapS = normal1.wrapT = THREE.RepeatWrapping;

        water = new WaterMesh(new THREE.CircleGeometry(camera.far / 2, 32), {
          color: 'azure',
          scale: 5,
          flowDirection: new THREE.Vector2(0.1, 0.3),
          normalMap0: normal0,
          normalMap1: normal1,
        });
        water.position.set(0, 0, 0);
        water.rotation.x = Math.PI * -0.5;
        water.renderOrder = Number.POSITIVE_INFINITY;
        scene.add(water);

        renderer.setAnimationLoop(() => {
          controls?.update();
          renderer?.render(scene as THREE.Scene, camera as THREE.PerspectiveCamera);
        });
      } catch (error) {
        console.error('Landing scene initialization failed', error);
      }
    };

    init();

    return () => {
      window.removeEventListener('resize', onResize);

      if (renderer) {
        renderer.setAnimationLoop(null);
      }
      controls?.dispose();

      if (water) {
        water.geometry?.dispose();
        if (Array.isArray(water.material)) {
          water.material.forEach((m: any) => m.dispose?.());
        } else {
          water.material?.dispose?.();
        }
      }

      normal0?.dispose?.();
      normal1?.dispose?.();
      envMap?.dispose?.();

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode === host) {
          host.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  const handleTitleTouchEnd = () => {
    const now = Date.now();
    if (now - touchTimeRef.current < 320) {
      onEnter();
    }
    touchTimeRef.current = now;
  };

  return (
    <div className="landing-scene">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Trocchi&display=swap');

        .landing-scene,
        .landing-scene *,
        .landing-scene *::before,
        .landing-scene *::after {
          box-sizing: border-box;
        }

        .landing-scene {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          font-family: 'Trocchi', Georgia, serif;
          background: #000;
          position: relative;
        }

        .landing-canvas-host {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .landing-canvas-host canvas {
          position: fixed !important;
          top: 0;
          left: 0;
          width: 100% !important;
          height: 100% !important;
          z-index: 0;
        }

        .landing-ui {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          pointer-events: none;
        }

        .landing-ui h1 {
          font-family: 'Anton', sans-serif;
          text-align: center;
          margin: 0;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          mask-image: linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%);
          font-size: clamp(4rem, 22vw, 20rem);
          font-weight: 400;
          line-height: 0.95;
          background-color: #a32c23;
          background-image:
            url('https://s3-us-west-2.amazonaws.com/s.cdpn.io/74321/tw-o.png'),
            url('https://s3-us-west-2.amazonaws.com/s.cdpn.io/74321/tw6-o.png'),
            url('https://s3-us-west-2.amazonaws.com/s.cdpn.io/74321/tw5-o.png');
          background-size: 45vw auto, 45vw auto, 30vw auto;
          background-repeat: repeat-x;
          background-position: -120px 15%, 230px 20%, -100px 3vw;
          filter: drop-shadow(0 2px 24px rgba(0, 0, 0, 0.55));
          cursor: pointer;
          pointer-events: auto;
          user-select: none;
        }

        .landing-tagline {
          margin-top: 1.5rem;
          height: 2.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          width: min(90vw, 52rem);
        }

        .landing-tagline span {
          font-size: clamp(0.9rem, 2vw, 1.4rem);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #e8e4d2;
          text-shadow: 0 1px 12px rgba(0, 0, 0, 0.8);
          position: absolute;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.9s ease, transform 0.9s ease;
          text-align: center;
        }

        .landing-tagline span.active {
          opacity: 1;
          transform: translateY(0);
        }

        .landing-tagline span.exit {
          opacity: 0;
          transform: translateY(-12px);
        }

        /* ── Premium CTA button ── */
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');

        .landing-cta {
          margin-top: 2.8rem;
          pointer-events: auto;
        }

        .landing-cta-btn {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: clamp(0.85rem, 1.2vw, 1.05rem);
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px) saturate(1.4);
          -webkit-backdrop-filter: blur(16px) saturate(1.4);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 16px 48px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition:
            transform 380ms cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 380ms cubic-bezier(0.4, 0, 0.2, 1),
            background 380ms cubic-bezier(0.4, 0, 0.2, 1),
            border-color 380ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .landing-cta-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.08),
            transparent
          );
          transition: left 600ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .landing-cta-btn:hover {
          transform: scale(1.06) translateY(-2px);
          background: rgba(255, 255, 255, 0.16);
          border-color: rgba(255, 255, 255, 0.35);
          box-shadow:
            0 0 0 4px rgba(255, 255, 255, 0.06),
            0 16px 48px rgba(0, 0, 0, 0.25);
        }

        .landing-cta-btn:hover::before {
          left: 100%;
        }

        .landing-cta-btn:active {
          transform: scale(0.98);
        }

        .landing-hint {
          margin-top: 1rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(232, 228, 210, 0.35);
        }
      `}</style>

      <div ref={canvasHostRef} className="landing-canvas-host" aria-hidden="true" />

      <div className="landing-ui">
        <header>
          <h1 onDoubleClick={onEnter} onTouchEnd={handleTitleTouchEnd} title="Double-tap to login">
            Olive &amp; Oak
          </h1>
        </header>

        <div className="landing-tagline">
          {taglines.map((line, index) => {
            const isActive = index === activeTagline;
            const isExiting = index === exitTagline;
            return (
              <span key={line} className={`${isActive ? 'active' : ''} ${isExiting ? 'exit' : ''}`.trim()}>
                {line}
              </span>
            );
          })}
        </div>

        <div className="landing-cta">
          <button className="landing-cta-btn" onClick={onEnter}>
            Enter Experience
          </button>
        </div>
        <p className="landing-hint">or double-click the title</p>
      </div>
    </div>
  );
}
