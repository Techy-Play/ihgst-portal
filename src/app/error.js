'use client';

import { useEffect, useRef, useState } from 'react';

export default function GlobalError({ error, reset }) {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#000', overflowX: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
      <MessageDisplay error={error} reset={reset} />
      <CharactersAnimation />
      <CircleAnimation />
    </div>
  );
}

function MessageDisplay({ error, reset }) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    console.error('Error boundary caught:', error);
    const timer = setTimeout(() => setIsVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '90%', height: '90%', zIndex: 100 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'opacity 0.5s', opacity: isVisible ? 1 : 0 }}>
        <div style={{ fontSize: '35px', fontWeight: 600, color: '#000', margin: '1%' }}>
          Something Went Wrong
        </div>
        <div style={{ fontSize: '80px', fontWeight: 700, color: '#000', margin: '1%' }}>
          500
        </div>
        <div style={{ fontSize: '15px', width: '50%', minWidth: '40%', textAlign: 'center', color: '#000', margin: '1%' }}>
          The page failed to load. This can happen due to a temporary server issue. Please try again.
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '32px' }}>
          <button
            onClick={() => reset()}
            onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000'; e.currentTarget.style.transform = 'scale(1)'; }}
            style={{ color: '#000', border: '2px solid #000', background: 'transparent', transition: 'all 0.3s ease-in-out', padding: '8px 24px', fontSize: '16px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
            </svg>
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            onMouseEnter={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.transform = 'scale(1)'; }}
            style={{ background: '#000', color: '#fff', border: 'none', transition: 'all 0.3s ease-in-out', padding: '8px 24px', fontSize: '16px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Hard Reload
          </button>
        </div>
        <button
          onClick={() => setShowDebug(!showDebug)}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          style={{ marginTop: '20px', padding: '6px 16px', border: '1px solid rgba(0,0,0,0.2)', background: 'transparent', color: '#555', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          {showDebug ? 'Hide' : 'Show'} Error Details
        </button>
        {showDebug && (
          <div style={{ marginTop: '12px', padding: '12px 16px', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)', maxWidth: '500px', width: '100%', textAlign: 'left', fontSize: '11px', fontFamily: 'monospace', color: '#333' }}>
            <p style={{ fontWeight: 700, marginBottom: '4px' }}>{error?.message || 'Unknown error'}</p>
            <p style={{ color: '#777', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, maxHeight: '120px', overflow: 'auto' }}>
              {error?.stack || 'No stack trace available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CharactersAnimation() {
  const charactersRef = useRef(null);

  useEffect(() => {
    const stickFigures = [
      { top: '0%', src: 'https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks/stick0.svg', transform: 'rotateZ(-90deg)', speedX: 1500 },
      { top: '10%', src: 'https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks/stick1.svg', speedX: 3000, speedRotation: 2000 },
      { top: '20%', src: 'https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks/stick2.svg', speedX: 5000, speedRotation: 1000 },
      { top: '25%', src: 'https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks/stick0.svg', speedX: 2500, speedRotation: 1500 },
      { top: '35%', src: 'https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks/stick0.svg', speedX: 2000, speedRotation: 300 },
      { bottom: '5%', src: 'https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks/stick3.svg', speedX: 0 },
    ];

    const container = charactersRef.current;
    if (!container) return;
    container.innerHTML = '';

    stickFigures.forEach((figure, index) => {
      const stick = document.createElement('img');
      stick.style.position = 'absolute';
      stick.style.width = '18%';
      stick.style.height = '18%';
      if (figure.top) stick.style.top = figure.top;
      if (figure.bottom) stick.style.bottom = figure.bottom;
      stick.src = figure.src;
      if (figure.transform) stick.style.transform = figure.transform;
      container.appendChild(stick);

      if (index === 5) return;
      stick.animate([{ left: '100%' }, { left: '-20%' }], { duration: figure.speedX, easing: 'linear', fill: 'forwards' });
      if (index === 0) return;
      if (figure.speedRotation) {
        stick.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }], { duration: figure.speedRotation, iterations: Infinity, easing: 'linear' });
      }
    });

    return () => { if (container) container.innerHTML = ''; };
  }, []);

  return <div ref={charactersRef} style={{ position: 'absolute', width: '99%', height: '95%' }} />;
}

function CircleAnimation() {
  const canvasRef = useRef(null);
  const requestIdRef = useRef();
  const timerRef = useRef(0);
  const circulosRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const initArr = () => {
      circulosRef.current = [];
      for (let i = 0; i < 300; i++) {
        const randomX = Math.floor(Math.random() * ((canvas.width * 3) - (canvas.width * 1.2) + 1)) + (canvas.width * 1.2);
        const randomY = Math.floor(Math.random() * ((canvas.height) - (canvas.height * (-0.2) + 1))) + (canvas.height * (-0.2));
        const size = canvas.width / 1000;
        circulosRef.current.push({ x: randomX, y: randomY, size });
      }
    };

    const draw = () => {
      const context = canvas.getContext('2d');
      if (!context) return;
      timerRef.current++;
      context.setTransform(1, 0, 0, 1, 0, 0);
      const distanceX = canvas.width / 80;
      const growthRate = canvas.width / 1000;
      context.fillStyle = 'white';
      context.clearRect(0, 0, canvas.width, canvas.height);

      circulosRef.current.forEach((circulo) => {
        context.beginPath();
        if (timerRef.current < 65) { circulo.x -= distanceX; circulo.size += growthRate; }
        if (timerRef.current > 65 && timerRef.current < 500) { circulo.x -= distanceX * 0.02; circulo.size += growthRate * 0.2; }
        context.arc(circulo.x, circulo.y, circulo.size, 0, Math.PI * 2);
        context.fill();
      });

      if (timerRef.current > 500) { cancelAnimationFrame(requestIdRef.current); return; }
      requestIdRef.current = requestAnimationFrame(draw);
    };

    timerRef.current = 0;
    initArr();
    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      timerRef.current = 0;
      if (requestIdRef.current) cancelAnimationFrame(requestIdRef.current);
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); }
      initArr();
      draw();
    };

    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); if (requestIdRef.current) cancelAnimationFrame(requestIdRef.current); };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}
