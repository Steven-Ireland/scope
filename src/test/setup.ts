import '@testing-library/jest-dom';

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(() => callback(performance.now()), 0) as any;
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};
