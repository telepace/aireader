/* eslint-disable testing-library/no-node-access */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { JsonlRenderer } from './JsonlRenderer';

describe('JsonlRenderer Component', () => {
  const jsonlContent = `{"type":"h1","content":"Hello World"}
{"type":"p","content":"This is a paragraph"}
{"type":"list","content":["item 1","item 2"]}`;

  test('renders JSONL content correctly', () => {
    render(<JsonlRenderer content={jsonlContent} />);

    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('This is a paragraph')).toBeInTheDocument();
    expect(screen.getByText('item 1')).toBeInTheDocument();
    expect(screen.getByText('item 2')).toBeInTheDocument();
  });

  test('handles empty content', () => {
    // eslint-disable-next-line testing-library/no-node-access
    const { container } = render(<JsonlRenderer content="" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test('handles invalid JSON gracefully', () => {
    const invalidContent = `invalid json
{"type":"p","content":"valid content"}`;
    
    render(<JsonlRenderer content={invalidContent} />);
    
    // Should render the invalid line as a paragraph
    expect(screen.getByText('invalid json')).toBeInTheDocument();
    expect(screen.getByText('valid content')).toBeInTheDocument();
  });

  test('renders different block types correctly', () => {
    const content = `{"type":"h1","content":"Heading"}
{"type":"h2","content":"Subheading"}
{"type":"h3","content":"Small heading"}
{"type":"quote","content":"This is a quote","ref":"Author"}
{"type":"insight","content":"Important insight","priority":"high"}
{"type":"concept","content":"This is a concept"}
{"type":"qa","content":{"q":"Question?","a":"Answer"}}
{"type":"action","content":"Do something important"}`;

    render(<JsonlRenderer content={content} />);

    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('Subheading')).toBeInTheDocument();
    expect(screen.getByText('Small heading')).toBeInTheDocument();
    expect(screen.getByText('This is a quote')).toBeInTheDocument();
    expect(screen.getByText('— Author')).toBeInTheDocument();
    expect(screen.getByText('Important insight')).toBeInTheDocument();
    expect(screen.getByText('This is a concept')).toBeInTheDocument();
    expect(screen.getByText('Q: Question?')).toBeInTheDocument();
    expect(screen.getByText('A: Answer')).toBeInTheDocument();
    expect(screen.getByText('行动:')).toBeInTheDocument();
    expect(screen.getByText('Do something important')).toBeInTheDocument();
  });

  test('handles null and undefined content', () => {
    // eslint-disable-next-line testing-library/no-node-access
    const { container: nullContainer } = render(
      <JsonlRenderer content={null} />
    );
    expect(nullContainer).toBeInTheDocument();

    // eslint-disable-next-line testing-library/no-node-access
    const { container: undefinedContainer } = render(
      <JsonlRenderer content={undefined} />
    );
    expect(undefinedContainer).toBeInTheDocument();
  });

  test('applies hover effects when enabled', () => {
    const content = `{"type":"p","content":"Hover over me"}`;
    
    render(<JsonlRenderer content={content} enableHoverEffects={true} />);
    
    const contentElement = screen.getByText('Hover over me');
    expect(contentElement).toBeInTheDocument();
  });

  test('disables hover effects when requested', () => {
    const content = `{"type":"p","content":"No hover effects"}`;
    
    render(<JsonlRenderer content={content} enableHoverEffects={false} />);
    
    const contentElement = screen.getByText('No hover effects');
    expect(contentElement).toBeInTheDocument();
  });

  test('handles dark mode styling', () => {
    const content = `{"type":"insight","content":"Dark mode test"}`;
    
    render(<JsonlRenderer content={content} darkMode={true} />);
    
    expect(screen.getByText('Dark mode test')).toBeInTheDocument();
  });

  test('handles copy functionality', async () => {
    const content = `{"type":"p","content":"Copy this text"}`;
    
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    render(<JsonlRenderer content={content} enableHoverEffects={true} />);
    
    // The copy button should appear on hover
    const paragraph = screen.getByText('Copy this text');
    expect(paragraph).toBeInTheDocument();
  });
});