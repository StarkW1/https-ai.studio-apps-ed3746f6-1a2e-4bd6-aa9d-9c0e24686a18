import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export function HandTracker({ scaleRef, rotationRef }: { scaleRef: React.MutableRefObject<number>, rotationRef: React.MutableRefObject<[number, number]> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let handLandmarker: HandLandmarker;
    let animationFrameId: number;
    let stream: MediaStream;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", predictWebcam);
        }
        setIsReady(true);
      } catch (err) {
        console.error(err);
        setError("Failed to initialize camera or hand tracker.");
      }
    }

    let lastVideoTime = -1;
    let currentScale = scaleRef.current;
    let rightPinchActive = false;
    let rightLastPos = { x: 0, y: 0 };

    async function predictWebcam() {
      if (!videoRef.current || !handLandmarker) return;

      let startTimeMs = performance.now();
      if (lastVideoTime !== videoRef.current.currentTime) {
        lastVideoTime = videoRef.current.currentTime;
        const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

        if (results.landmarks && results.landmarks.length > 0) {
          for (let i = 0; i < results.landmarks.length; i++) {
            const landmarks = results.landmarks[i];
            const handedness = results.handednesses[i][0].categoryName; // "Left" or "Right"
            
            const thumb = landmarks[4];
            const index = landmarks[8];
            const dx = thumb.x - index.x;
            const dy = thumb.y - index.y;
            const dz = thumb.z - index.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            if (handedness === 'Left') {
              // Left hand: pinch to scale
              const targetScale = Math.max(0.2, Math.min(dist * 10, 5.0));
              currentScale = currentScale * 0.8 + targetScale * 0.2;
              scaleRef.current = currentScale;
            } else if (handedness === 'Right') {
              // Right hand: pinch and drag to rotate
              if (dist < 0.05) { // Pinched
                if (!rightPinchActive) {
                  rightPinchActive = true;
                  rightLastPos = { x: index.x, y: index.y };
                } else {
                  const deltaX = index.x - rightLastPos.x;
                  const deltaY = index.y - rightLastPos.y;
                  rotationRef.current[0] += deltaY * 2.0; // Pitch
                  rotationRef.current[1] += deltaX * 2.0; // Yaw
                  rightLastPos = { x: index.x, y: index.y };
                }
              } else {
                rightPinchActive = false;
              }
            }
          }
        } else {
          rightPinchActive = false;
        }
      }
      animationFrameId = requestAnimationFrame(predictWebcam);
    }

    init();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [scaleRef, rotationRef]);

  return (
    <div className="fixed bottom-6 right-6 w-48 h-36 bg-black/50 rounded-xl overflow-hidden border border-white/10 backdrop-blur-md shadow-2xl">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-[10px] uppercase tracking-widest bg-black/80">
          Loading Camera...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-500/80 text-[10px] uppercase tracking-widest text-center p-4 bg-black/80">
          {error}
        </div>
      )}
      <div className="absolute top-2 left-2 text-[8px] text-white/70 font-mono bg-black/60 px-2 py-1 rounded backdrop-blur-sm uppercase tracking-wider">
        L: Scale | R: Rotate
      </div>
    </div>
  );
}
