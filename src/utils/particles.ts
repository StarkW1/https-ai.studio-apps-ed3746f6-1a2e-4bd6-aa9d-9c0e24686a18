import * as THREE from 'three';

export type ShapeType = 'sphere' | 'cube' | 'torus' | 'cloud' | 'image' | 'model';

export async function getModelData(file: File, count: number, color1: string, color2: string): Promise<{ positions: Float32Array, colors: Float32Array }> {
  const url = URL.createObjectURL(file);
  const extension = file.name.split('.').pop()?.toLowerCase();
  let object: THREE.Object3D;

  if (extension === 'obj') {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
    const loader = new OBJLoader();
    object = await loader.loadAsync(url);
  } else if (extension === 'fbx') {
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
    const loader = new FBXLoader();
    object = await loader.loadAsync(url);
  } else {
    throw new Error('Unsupported file format');
  }

  const meshes: THREE.Mesh[] = [];
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshes.push(child as THREE.Mesh);
    }
  });

  if (meshes.length === 0) throw new Error('No meshes found in model');

  const { mergeGeometries } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');
  const { MeshSurfaceSampler } = await import('three/examples/jsm/math/MeshSurfaceSampler.js');

  const geometries = meshes.map(m => {
    const geom = m.geometry.clone();
    geom.applyMatrix4(m.matrixWorld);
    return geom;
  });

  const mergedGeometry = mergeGeometries(geometries);
  mergedGeometry.computeBoundingBox();
  const box = mergedGeometry.boundingBox!;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 5.0 / maxDim;

  mergedGeometry.translate(-center.x, -center.y, -center.z);
  mergedGeometry.scale(scale, scale, scale);

  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(mergedGeometry, material);

  const sampler = new MeshSurfaceSampler(mesh).build();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tempPosition = new THREE.Vector3();
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  const tempColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    sampler.sample(tempPosition);
    positions[i * 3] = tempPosition.x;
    positions[i * 3 + 1] = tempPosition.y;
    positions[i * 3 + 2] = tempPosition.z;

    const mixRatio = i / count;
    tempColor.copy(c1).lerp(c2, mixRatio);
    colors[i * 3] = tempColor.r;
    colors[i * 3 + 1] = tempColor.g;
    colors[i * 3 + 2] = tempColor.b;
  }

  URL.revokeObjectURL(url);
  return { positions, colors };
}

export function getParticleData(count: number, shape: ShapeType, color1: string, color2: string): { positions: Float32Array, colors: Float32Array } {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  const tempColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    if (shape === 'sphere') {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const r = 2.5;
      positions[i3] = r * Math.cos(theta) * Math.sin(phi);
      positions[i3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      positions[i3 + 2] = r * Math.cos(phi);
    } else if (shape === 'cube') {
      const s = Math.ceil(Math.pow(count, 1/3));
      const x = (i % s) - s/2;
      const y = (Math.floor(i / s) % s) - s/2;
      const z = (Math.floor(i / (s * s))) - s/2;
      const spacing = 4 / s;
      positions[i3] = x * spacing;
      positions[i3 + 1] = y * spacing;
      positions[i3 + 2] = z * spacing;
    } else if (shape === 'torus') {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;
      const R = 2;
      const r = 0.8;
      positions[i3] = (R + r * Math.cos(v)) * Math.cos(u);
      positions[i3 + 1] = (R + r * Math.cos(v)) * Math.sin(u);
      positions[i3 + 2] = r * Math.sin(v);
    } else if (shape === 'cloud') {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * 3.5;
      
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);
    }

    // Color gradient based on index (creates a nice flow)
    const mixRatio = i / count;
    tempColor.copy(c1).lerp(c2, mixRatio);
    colors[i3] = tempColor.r;
    colors[i3 + 1] = tempColor.g;
    colors[i3 + 2] = tempColor.b;
  }
  
  return { positions, colors };
}

export function getImageData(imageSrc: string, count: number): Promise<{ positions: Float32Array, colors: Float32Array }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(getParticleData(count, 'sphere', '#ffffff', '#ffffff'));

      const maxSize = 200;
      let w = img.width;
      let h = img.height;
      if (w > h) {
        h = (h / w) * maxSize;
        w = maxSize;
      } else {
        w = (w / h) * maxSize;
        h = maxSize;
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h).data;

      const validPixels: {x: number, y: number, r: number, g: number, b: number}[] = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const a = imgData[idx + 3];
          if (a > 50) { // Threshold for alpha
            validPixels.push({
              x: (x / w - 0.5) * 6,
              y: -(y / h - 0.5) * 6,
              r: imgData[idx] / 255,
              g: imgData[idx + 1] / 255,
              b: imgData[idx + 2] / 255
            });
          }
        }
      }

      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      if (validPixels.length === 0) {
        resolve(getParticleData(count, 'sphere', '#ffffff', '#ffffff'));
        return;
      }

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const pixel = validPixels[Math.floor(Math.random() * validPixels.length)];
        positions[i3] = pixel.x + (Math.random() - 0.5) * 0.05;
        positions[i3 + 1] = pixel.y + (Math.random() - 0.5) * 0.05;
        positions[i3 + 2] = (Math.random() - 0.5) * 0.2;

        colors[i3] = pixel.r;
        colors[i3 + 1] = pixel.g;
        colors[i3 + 2] = pixel.b;
      }

      resolve({ positions, colors });
    };
    img.onerror = () => resolve(getParticleData(count, 'sphere', '#ffffff', '#ffffff'));
    img.src = imageSrc;
  });
}
