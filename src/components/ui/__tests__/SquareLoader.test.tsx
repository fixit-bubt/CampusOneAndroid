import React from 'react';
import { SquareLoader } from '../SquareLoader';

describe('SquareLoader', () => {
  it('is a defined component function', () => {
    expect(typeof SquareLoader).toBe('function');
  });

  it('instantiates without throwing', () => {
    const element = React.createElement(SquareLoader, { scale: 0.75 });
    expect(element).toBeDefined();
    expect(element.props.scale).toBe(0.75);
  });
});

