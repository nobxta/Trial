"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

export default function FAQ() {
  const [openId, setOpenId] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      id: 1,
      question: "How can I track my order?",
      answer:
        "Use your order ID from the confirmation page or email to track status in real time. Most exchanges complete within 10–30 minutes depending on network congestion.",
    },
    {
      id: 2,
      question: "Why can I trust you?",
      answer:
        "We use secure, non-custodial swaps and display transparent rates and fees before you confirm. No registration or KYC is required for standard limits, and we’ve served thousands of users.",
    },
    {
      id: 3,
      question: "Do you have hidden fees?",
      answer:
        "No. You see the exchange rate and our fee (fixed or floating) before you confirm. Blockchain network fees are separate and are shown in the order summary.",
    },
    {
      id: 4,
      question: "What is the difference between Fixed and Floating rate?",
      answer:
        "Fixed rate (1.0% fee) locks in the exchange rate at the time of order creation. Floating rate (0.5% fee) uses the market rate at completion and may vary slightly.",
    },
    {
      id: 5,
      question: "How long does an exchange take?",
      answer:
        "Most exchanges complete within 10–30 minutes. Exact time depends on blockchain confirmations. Track your order in real time using your order ID.",
    },
    {
      id: 6,
      question: "What happens if my transaction fails?",
      answer:
        "If a transaction fails, your sent cryptocurrency is refunded to your original address, typically within 24–48 hours. Contact support with your order ID if you need help.",
    },
  ];

  const toggleFAQ = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="space-y-0">
      {faqs.map((faq, index) => (
        <div
          key={faq.id}
          className="border-b border-white/10 last:border-b-0"
        >
          <div
            className="flex items-center gap-4 sm:gap-6 py-4 sm:py-5 w-full text-left"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums flex-shrink-0 w-8 sm:w-10">
              {index + 1}
            </span>
            <button
              onClick={() => toggleFAQ(faq.id)}
              className="flex-1 min-w-0 flex items-center justify-between gap-4 group"
            >
              <h4 className="text-sm sm:text-base font-medium text-white/95 group-hover:text-white transition-colors text-left">
                {faq.question}
              </h4>
              <span
                className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#2196F3] flex items-center justify-center text-white transition-transform duration-300 hover:bg-blue-400"
                aria-label={openId === faq.id ? "Collapse" : "Expand"}
              >
                <Plus
                  className={`w-4 h-4 transition-transform duration-300 ${
                    openId === faq.id ? "rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
              openId === faq.id ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="pl-12 sm:pl-14 pb-4 sm:pb-5 pr-4">
                <p
                  className={`text-xs sm:text-sm leading-relaxed transition-colors duration-300 ${
                    openId === faq.id ? "text-sky-400/95" : "text-neutral-400"
                  }`}
                >
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="pt-6 flex justify-end">
        <Link
          href="/faq"
          className="inline-flex items-center gap-2 text-[#2196F3] hover:text-blue-400 transition-colors text-sm font-medium"
        >
          Go to page FAQ
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
