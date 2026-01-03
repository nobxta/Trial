import React from 'react';

interface ContentRendererProps {
  content: string;
}

export default function ContentRenderer({ content }: ContentRendererProps) {
  // Split content into paragraphs and process markdown-like formatting
  const processContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentParagraph: string[] = [];
    let inBox = false;
    let boxContent: string[] = [];
    let boxTitle = '';

    const renderParagraph = (para: string[]) => {
      if (para.length === 0) return null;
      const text = para.join(' ').trim();
      if (!text) return null;

      // Check for bold text **text**
      const processedText = text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      // Check for links [text](url)
      const linkProcessed = processedText.map((part, i) => {
        if (typeof part === 'string') {
          const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (linkMatch) {
            const before = part.substring(0, part.indexOf(linkMatch[0]));
            const after = part.substring(part.indexOf(linkMatch[0]) + linkMatch[0].length);
            return (
              <React.Fragment key={i}>
                {before}
                <a 
                  href={linkMatch[2]} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  {linkMatch[1]}
                </a>
                {after}
              </React.Fragment>
            );
          }
        }
        return part;
      });

      return <p key={elements.length} className="text-neutral-300 leading-relaxed mb-4">{linkProcessed}</p>;
    };

    const renderBox = (title: string, items: string[]) => {
      return (
        <div 
          key={elements.length}
          className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-6 my-6"
        >
          {title && (
            <h3 className="text-white font-semibold mb-4 text-lg">{title}</h3>
          )}
          <ul className="space-y-2">
            {items.map((item, idx) => {
              // Process bold text in list items
              const parts = item.split(/(\*\*[^*]+\*\*)/g);
              return (
                <li key={idx} className="text-neutral-300 flex items-start">
                  <span className="text-blue-400 mr-3 mt-1">•</span>
                  <span>
                    {parts.map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect box start
      if ((line.startsWith('**') && (line.includes('example model') || line.includes('brief example') || line.includes('Key Points') || line.includes('Summary') || line.includes('Points'))) || 
          (line.includes('Key Points') || line.includes('Summary'))) {
        inBox = true;
        boxTitle = line.replace(/\*\*/g, '').replace(/:/g, '').trim();
        boxContent = [];
        continue;
      }

      // Detect box end (empty line after box content or new heading)
      if (inBox && (line === '' || line.startsWith('**') && !line.includes('•'))) {
        if (boxContent.length > 0) {
          elements.push(renderBox(boxTitle, boxContent));
        }
        inBox = false;
        boxTitle = '';
        boxContent = [];
      }

      if (inBox) {
        // Process list items in box
        if (line.startsWith('•') || line.startsWith('-')) {
          boxContent.push(line.substring(1).trim());
        } else if (line) {
          boxContent.push(line);
        }
        continue;
      }

      // Process headings
      if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
        if (currentParagraph.length > 0) {
          const para = renderParagraph(currentParagraph);
          if (para) elements.push(para);
          currentParagraph = [];
        }
        const headingText = line.replace(/\*\*/g, '');
        elements.push(
          <h2 key={elements.length} className="text-2xl font-bold text-white mt-8 mb-4">
            {headingText}
          </h2>
        );
        continue;
      }

      // Regular paragraph
      if (line) {
        currentParagraph.push(line);
      } else {
        if (currentParagraph.length > 0) {
          const para = renderParagraph(currentParagraph);
          if (para) elements.push(para);
          currentParagraph = [];
        }
      }
    }

    // Render remaining content
    if (inBox && boxContent.length > 0) {
      elements.push(renderBox(boxTitle, boxContent));
    }
    if (currentParagraph.length > 0) {
      const para = renderParagraph(currentParagraph);
      if (para) elements.push(para);
    }

    return elements;
  };

  return (
    <div className="space-y-4">
      {processContent(content)}
    </div>
  );
}

