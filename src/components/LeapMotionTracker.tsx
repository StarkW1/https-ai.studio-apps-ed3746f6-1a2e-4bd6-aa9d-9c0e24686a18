import { useEffect, useState } from 'react';

export function LeapMotionTracker({ scaleRef, rotationRef }: { scaleRef: React.MutableRefObject<number>, rotationRef: React.MutableRefObject<[number, number]> }) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    let ws: WebSocket;
    let currentScale = scaleRef.current;
    let rightPinchActive = false;
    let rightLastPos = { x: 0, y: 0 };

    const connect = () => {
      ws = new WebSocket('ws://127.0.0.1:6437/v6.json');

      ws.onopen = () => {
        setStatus('connected');
        ws.send(JSON.stringify({ background: true }));
      };

      ws.onerror = () => {
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus('error');
        setTimeout(connect, 3000);
      };

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data);
          if (frame.hands && frame.hands.length > 0) {
            frame.hands.forEach((hand: any) => {
              if (hand.type === 'left') {
                const grab = hand.grabStrength; // 0 to 1
                const targetScale = 1.0 + (1.0 - grab) * 1.5; // 1.0 to 2.5
                currentScale = currentScale * 0.9 + targetScale * 0.1;
                scaleRef.current = currentScale;
              } else if (hand.type === 'right') {
                const pinch = hand.pinchStrength;
                if (pinch > 0.8) {
                  const pos = hand.palmPosition;
                  if (!rightPinchActive) {
                    rightPinchActive = true;
                    rightLastPos = { x: pos[0], y: pos[1] };
                  } else {
                    const deltaX = pos[0] - rightLastPos.x;
                    const deltaY = pos[1] - rightLastPos.y;
                    rotationRef.current[0] -= deltaY * 0.005;
                    rotationRef.current[1] += deltaX * 0.005;
                    rightLastPos = { x: pos[0], y: pos[1] };
                  }
                } else {
                  rightPinchActive = false;
                }
              }
            });
          } else {
            rightPinchActive = false;
          }
        } catch (e) {}
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
    };
  }, [scaleRef, rotationRef]);

  return (
    <div className="fixed bottom-6 right-6 w-48 h-16 bg-black/50 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-md shadow-2xl">
      <div className="text-[10px] uppercase tracking-widest text-white/70 flex flex-col items-center gap-1">
        <span>Leap Motion</span>
        <span className={status === 'connected' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-yellow-400'}>
          {status}
        </span>
      </div>
    </div>
  );
}
