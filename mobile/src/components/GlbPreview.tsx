import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Box3, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { resolveGlbUri } from './glbAssets';

type Props = {
  categoryId?: string;
  thumbnailUrl?: string;
};

type ErrorBoundaryProps = {
  onError: () => void;
  resetKey: string;
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class ModelErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function Model({ uri }: { uri: string }) {
  const gltf = useLoader(GLTFLoader, uri);
  const { scene, scaleValue } = useMemo(() => {
    const cloned = gltf.scene.clone();
    const bbox = new Box3().setFromObject(cloned);
    const size = new Vector3();
    const center = new Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const nextScale = 1.35 / maxDim;

    cloned.position.x -= center.x;
    cloned.position.y -= center.y;
    cloned.position.z -= center.z;

    return { scene: cloned, scaleValue: nextScale };
  }, [gltf.scene]);
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) {
      return;
    }
    groupRef.current.rotation.y += delta * 0.4;
  });

  return <primitive ref={groupRef} object={scene} scale={scaleValue} position={[0, -0.22, 0]} />;
}

export function GlbPreview({ categoryId, thumbnailUrl }: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setHasLoadError(false);
      const resolved = categoryId ? await resolveGlbUri(categoryId) : null;
      if (mounted) {
        setUri(resolved);
        setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [categoryId]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!uri || hasLoadError) {
    return <Image source={{ uri: thumbnailUrl || 'https://placehold.co/300x300?text=GLB' }} style={styles.image} />;
  }

  return (
    <View style={styles.canvasWrap}>
      <Canvas camera={{ position: [0, 1.1, 2.3], fov: 45 }}>
        <ambientLight intensity={1.15} />
        <directionalLight position={[2.5, 3.1, 2.3]} intensity={1.2} />
        <directionalLight position={[-2.3, 1.2, 1.5]} intensity={0.6} />
        <ModelErrorBoundary onError={() => setHasLoadError(true)} resetKey={uri}>
          <Suspense fallback={null}>
            <Model uri={uri} />
          </Suspense>
        </ModelErrorBoundary>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  canvasWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    overflow: 'hidden',
    backgroundColor: '#F4E8D6',
  },
  loading: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 45,
    backgroundColor: '#F4E8D6',
  },
});
