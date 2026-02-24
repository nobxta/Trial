"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Flame,
  Snowflake,
  Scale,
  Shield,
  MapPin,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";

interface ContentRendererProps {
  content: string;
  animated?: boolean;
}

// Map leading emoji in headings to Lucide icons (high-quality SVG)
const HEADING_ICON_MAP: { emoji: string; Icon: LucideIcon }[] = [
  { emoji: "🔥", Icon: Flame },
  { emoji: "❄️", Icon: Snowflake },
  { emoji: "⚖️", Icon: Scale },
  { emoji: "🛡️", Icon: Shield },
  { emoji: "📌", Icon: MapPin },
  { emoji: "✅", Icon: CheckCircle },
];

function getHeadingIconAndLabel(text: string): {
  Icon: LucideIcon | null;
  label: string;
} {
  const trimmed = text.trim();
  for (const { emoji, Icon } of HEADING_ICON_MAP) {
    if (trimmed.startsWith(emoji)) {
      return { Icon, label: trimmed.slice(emoji.length).trim() };
    }
  }
  return { Icon: null, label: trimmed };
}

function processInlineFormatting(text: string, keyPrefix: string) {
  const processedText = text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });

  return processedText.map((part, i) => {
    if (typeof part === "string") {
      const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const before = part.substring(0, part.indexOf(linkMatch[0]));
        const after = part.substring(
          part.indexOf(linkMatch[0]) + linkMatch[0].length
        );
        return (
          <React.Fragment key={`${keyPrefix}-l-${i}`}>
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
}

export default function ContentRenderer({
  content,
  animated = true,
}: ContentRendererProps) {
  const processContent = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let currentParagraph: string[] = [];
    let inBox = false;
    let boxContent: string[] = [];
    let boxTitle = "";
    let tableRows: string[][] = [];

    const flushParagraph = () => {
      if (currentParagraph.length === 0) return null;
      const paraText = currentParagraph.join(" ").trim();
      currentParagraph = [];
      if (!paraText) return null;
      return (
        <p className="text-neutral-300 leading-relaxed mb-4">
          {processInlineFormatting(paraText, `p-${elements.length}`)}
        </p>
      );
    };

    const renderParagraph = (para: string[]) => {
      if (para.length === 0) return null;
      const paraText = para.join(" ").trim();
      if (!paraText) return null;
      return (
        <p className="text-neutral-300 leading-relaxed mb-4">
          {processInlineFormatting(paraText, `p-${elements.length}`)}
        </p>
      );
    };

    const renderBox = (title: string, items: string[]) => {
      const { Icon: BoxIcon, label: boxLabel } = getHeadingIconAndLabel(title);
      return (
        <div
          key={`box-${elements.length}`}
          className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-6 my-6 shadow-lg"
        >
          {title && (
            <h3 className="text-white font-semibold mb-4 text-lg flex items-center gap-2">
              {BoxIcon && (
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-white/10 text-blue-400 shrink-0">
                  <BoxIcon className="w-4 h-4" strokeWidth={2} />
                </span>
              )}
              {boxLabel}
            </h3>
          )}
          <ul className="space-y-2">
            {items.map((item, idx) => {
              const parts = item.split(/(\*\*[^*]+\*\*)/g);
              return (
                <li key={idx} className="text-neutral-300 flex items-start gap-2">
                  <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                  <span>
                    {parts.map((part, i) =>
                      part.startsWith("**") && part.endsWith("**") ? (
                        <strong
                          key={i}
                          className="text-white font-semibold"
                        >
                          {part.slice(2, -2)}
                        </strong>
                      ) : (
                        part
                      )
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    };

    const renderTable = (rows: string[][]) => {
      if (rows.length === 0) return null;
      const isSeparator = (row: string[]) =>
        row.every((cell) => /^[-:]+$/.test(cell.trim()));
      const [headerRow, ...rest] = rows;
      const bodyRows = rest.filter((row) => !isSeparator(row));
      return (
        <div
          key={`table-${elements.length}`}
          className="my-8 overflow-hidden rounded-xl border border-white/10 bg-white/5"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {headerRow?.map((cell, j) => (
                    <th
                      key={j}
                      className="px-4 py-3 text-sm font-semibold text-white"
                    >
                      {cell.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="px-4 py-3 text-sm text-neutral-300"
                      >
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    const pushElement = (el: React.ReactNode) => {
      if (el != null) elements.push(el);
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Markdown table: line with | ... |
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const prev = flushParagraph();
        if (prev) pushElement(prev);
        const cells = trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        tableRows.push(cells);
        continue;
      }

      // End of table
      if (tableRows.length > 0) {
        pushElement(renderTable(tableRows));
        tableRows = [];
      }

      // Box start (Key Points, Summary, When to Use, etc.)
      const boxTrigger =
        /Key Points|Summary|Points|When to Use|Best Practice|brief example|example model/i;
      if (
        (trimmed.startsWith("**") && boxTrigger.test(trimmed)) ||
        (!trimmed.startsWith("**") && boxTrigger.test(trimmed))
      ) {
        const prev = flushParagraph();
        if (prev) pushElement(prev);
        inBox = true;
        boxTitle = trimmed.replace(/\*\*/g, "").replace(/:/g, "").trim();
        boxContent = [];
        continue;
      }

      // Box end (empty line or new ** heading that isn't a list item)
      if (
        inBox &&
        (trimmed === "" || (trimmed.startsWith("**") && !trimmed.includes("•")))
      ) {
        if (boxContent.length > 0) pushElement(renderBox(boxTitle, boxContent));
        inBox = false;
        boxTitle = "";
        boxContent = [];
        if (trimmed === "") continue;
        // Same line can start the next box (e.g. "When to Use a Cold Wallet")
        if (boxTrigger.test(trimmed)) {
          inBox = true;
          boxTitle = trimmed.replace(/\*\*/g, "").replace(/:/g, "").trim();
          boxContent = [];
          continue;
        }
      }

      if (inBox) {
        if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
          boxContent.push(trimmed.substring(1).trim());
        } else if (trimmed) {
          boxContent.push(trimmed);
        }
        continue;
      }

      // H2: **Heading** — leading emoji is replaced with Lucide icon
      if (
        trimmed.startsWith("**") &&
        trimmed.endsWith("**") &&
        trimmed.length > 4
      ) {
        const prev = flushParagraph();
        if (prev) pushElement(prev);
        const rawHeading = trimmed.replace(/\*\*/g, "");
        const { Icon, label } = getHeadingIconAndLabel(rawHeading);
        pushElement(
          <h2
            key={`h2-${elements.length}`}
            className="text-2xl font-bold text-white mt-8 mb-4 flex items-center gap-3"
          >
            {Icon && (
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 text-blue-400 shrink-0">
                <Icon className="w-5 h-5" strokeWidth={2} />
              </span>
            )}
            <span>{label}</span>
          </h2>
        );
        continue;
      }

      // H3: ***Subheading***
      if (
        trimmed.startsWith("***") &&
        trimmed.endsWith("***") &&
        trimmed.length > 6
      ) {
        const prev = flushParagraph();
        if (prev) pushElement(prev);
        const subText = trimmed.replace(/\*\*\*/g, "");
        pushElement(
          <h3
            key={`h3-${elements.length}`}
            className="text-lg font-semibold text-neutral-200 mt-6 mb-3"
          >
            {subText}
          </h3>
        );
        continue;
      }

      if (trimmed) {
        currentParagraph.push(line);
      } else {
        const prev = flushParagraph();
        if (prev) pushElement(prev);
      }
    }

    if (tableRows.length > 0) pushElement(renderTable(tableRows));
    if (inBox && boxContent.length > 0)
      pushElement(renderBox(boxTitle, boxContent));
    const last = flushParagraph();
    if (last) pushElement(last);

    return elements;
  };

  const contentElements = processContent(content);

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: animated ? 0.06 : 0,
        delayChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  if (animated) {
    return (
      <motion.div
        className="space-y-4"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {contentElements.map((el, idx) => (
          <motion.div key={idx} variants={item}>
            {el}
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return <div className="space-y-4">{contentElements}</div>;
}
