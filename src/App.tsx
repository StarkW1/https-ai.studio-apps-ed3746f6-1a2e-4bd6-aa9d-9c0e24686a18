import { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Particles } from './components/Particles';
import { HandTracker } from './components/HandTracker';
import { LeapMotionTracker } from './components/LeapMotionTracker';
import { ShapeType, getParticleData, getImageData, getModelData } from './utils/particles';
import { Hand, Box, Circle, Cloud, Donut, ImagePlus, Cuboid, type LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SHAPES: { type: ShapeType; icon: LucideIcon; label: string }[] = [
  { type: 'sphere', icon: Circle, label: 'Sphere' },
  { type: 'cube', icon: Box, label: 'Cube' },
  { type: 'torus', icon: Donut, label: 'Torus' },
  { type: 'cloud', icon: Cloud, label: 'Cloud' },
];

const PARTICLE_COUNT = 30000;

export default function App() {
  const [shape, setShape] = useState<ShapeType>('sphere');
  const [color1, setColor1] = useState<string>('#00ffcc');
  const [color2, setColor2] = useState<string>('#ff00ff');
  const [trackerType, setTrackerType] = useState<'none' | 'webcam' | 'leap'>('none');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [targetData, setTargetData] = useState<{positions: Float32Array | null, colors: Float32Array | null}>({
    positions: null,
    colors: null
  });

  const scaleRef = useRef<number>(1);
  const rotationRef = useRef<[number, number]>([0, 0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoading(true);
    if (shape === 'image' && imageSrc) {
      getImageData(imageSrc, PARTICLE_COUNT).then(data => {
        setTargetData(data);
        setIsLoading(false);
      });
    } else if (shape === 'model' && modelFile) {
      getModelData(modelFile, PARTICLE_COUNT, color1, color2).then(data => {
        setTargetData(data);
        setIsLoading(false);
      }).catch(e => {
        console.error(e);
        alert("Failed to load 3D model. Please ensure it's a valid FBX or OBJ file.");
        setShape('sphere');
        setIsLoading(false);
      });
    } else {
      setTargetData(getParticleData(PARTICLE_COUNT, shape, color1, color2));
      setIsLoading(false);
    }
  }, [shape, color1, color2, imageSrc, modelFile]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setShape('image');
    }
  };

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModelFile(file);
      setShape('model');
    }
  };

  return (
    <div className="w-full h-screen bg-[#050505] text-white overflow-hidden font-sans">
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
          <color attach="background" args={['#050505']} />
          <ambientLight intensity={0.5} />
          <Particles 
            count={PARTICLE_COUNT}
            targetPositions={targetData.positions} 
            targetColors={targetData.colors} 
            scaleRef={scaleRef}
            rotationRef={rotationRef}
          />
          <OrbitControls enablePan={false} enableZoom={true} />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-8 z-10 pointer-events-none flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-light tracking-widest text-white/90">
            虚拟仿真驱动的<span className="font-bold text-white">交互空间创新</span>
          </h1>
          <p className="text-[10px] text-white/40 mt-2 tracking-[0.2em] uppercase">Interactive 3D Experience</p>
          <p className="text-[10px] text-[#00ffcc]/80 mt-1 tracking-[0.2em] uppercase font-bold">Yintong Wang</p>
        </div>
        {isLoading && (
          <div className="text-[10px] text-[#00ffcc] tracking-[0.2em] uppercase animate-pulse">
            Processing Data...
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-10 pointer-events-auto">
        {/* Shapes */}
        <div className="flex flex-col gap-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1">Formations</div>
          <div className="flex flex-col gap-3">
            {SHAPES.map((s) => {
              const Icon = s.icon;
              const isActive = shape === s.type;
              return (
                <button
                  key={s.type}
                  onClick={() => setShape(s.type)}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border",
                    isActive 
                      ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                      : "bg-black/40 text-white/40 border-white/10 hover:border-white/30 hover:text-white backdrop-blur-sm"
                  )}
                  title={s.label}
                >
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                </button>
              );
            })}
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border",
                shape === 'image'
                  ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                  : "bg-black/40 text-white/40 border-white/10 hover:border-white/30 hover:text-white backdrop-blur-sm"
              )}
              title="Upload Image"
            >
              <ImagePlus size={20} strokeWidth={shape === 'image' ? 2 : 1.5} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />

            <button
              onClick={() => modelInputRef.current?.click()}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border",
                shape === 'model'
                  ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                  : "bg-black/40 text-white/40 border-white/10 hover:border-white/30 hover:text-white backdrop-blur-sm"
              )}
              title="Upload 3D Model (FBX/OBJ)"
            >
              <Cuboid size={20} strokeWidth={shape === 'model' ? 2 : 1.5} />
            </button>
            <input 
              type="file" 
              ref={modelInputRef} 
              className="hidden" 
              accept=".obj,.fbx" 
              onChange={handleModelUpload} 
            />
          </div>
        </div>

        {/* Colors */}
        {shape !== 'image' && (
          <div className="flex flex-col gap-4">
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1">Gradient Colors</div>
            <div className="flex flex-col gap-3">
              <input 
                type="color" 
                value={color1} 
                onChange={(e) => setColor1(e.target.value)}
                className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              />
              <input 
                type="color" 
                value={color2} 
                onChange={(e) => setColor2(e.target.value)}
                className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tracking Toggles */}
      <div className="absolute bottom-8 left-8 z-10 pointer-events-auto flex gap-4">
        <button
          onClick={() => setTrackerType(trackerType === 'webcam' ? 'none' : 'webcam')}
          className={cn(
            "flex items-center gap-3 px-5 py-3 rounded-full transition-all duration-500 border backdrop-blur-md",
            trackerType === 'webcam'
              ? "bg-white/10 border-white/30 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
              : "bg-black/40 border-white/10 text-white/40 hover:text-white hover:border-white/30"
          )}
        >
          <Hand size={18} className={trackerType === 'webcam' ? "animate-pulse text-[#00ffcc]" : ""} strokeWidth={1.5} />
          <span className="text-[9px] font-medium tracking-[0.15em] uppercase">
            Webcam
          </span>
        </button>

        <button
          onClick={() => setTrackerType(trackerType === 'leap' ? 'none' : 'leap')}
          className={cn(
            "flex items-center gap-3 px-5 py-3 rounded-full transition-all duration-500 border backdrop-blur-md",
            trackerType === 'leap'
              ? "bg-white/10 border-white/30 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
              : "bg-black/40 border-white/10 text-white/40 hover:text-white hover:border-white/30"
          )}
        >
          <span className="text-[9px] font-medium tracking-[0.15em] uppercase">
            Leap Motion
          </span>
        </button>
      </div>

      {/* Tracker Components */}
      {trackerType === 'webcam' && <HandTracker scaleRef={scaleRef} rotationRef={rotationRef} />}
      {trackerType === 'leap' && <LeapMotionTracker scaleRef={scaleRef} rotationRef={rotationRef} />}
    </div>
  );
}
