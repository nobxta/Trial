"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

export default function FAQ() {
  const [openId, setOpenId] = useState<number | null>(null);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const faqs: FAQItem[] = [
    {
      id: 1,
      question: "What is the difference between Fixed and Floating rate?",
      answer:
        "Fixed rate (1.0% fee) locks in the exchange rate at the time of order creation, ensuring you receive exactly the amount shown. Floating rate (0.5% fee) uses the market rate at the time of exchange completion, which may result in slightly more or less than estimated.",
    },
    {
      id: 2,
      question: "Do I need to complete KYC verification?",
      answer:
        "No, KYC is not required for standard exchange limits. Our platform allows you to exchange cryptocurrencies without registration or identity verification, maintaining your privacy while using our service.",
    },
    {
      id: 3,
      question: "How long does an exchange take?",
      answer:
        "Most exchanges complete within 10-30 minutes. The exact time depends on blockchain network congestion and confirmation requirements. You can track your order status in real-time using your order ID.",
    },
    {
      id: 4,
      question: "Are there network fees?",
      answer:
        "Yes, blockchain network fees apply and are separate from our exchange fee. Network fees are paid to miners/validators and vary based on network congestion. Estimated network fees are shown before you confirm your exchange.",
    },
    {
      id: 5,
      question: "What happens if my transaction fails?",
      answer:
        "If a transaction fails due to network issues or insufficient funds, your sent cryptocurrency will be automatically refunded to your original address. Refunds typically process within 24-48 hours. Contact support if you need assistance.",
    },
    {
      id: 6,
      question: "How can I get support?",
      answer:
        "You can reach our support team through the support page, email, or live chat. We're available 24/7 to assist with any questions or issues. Include your order ID for faster assistance.",
    },
  ];

  useEffect(() => {
    const observers = itemRefs.current.map((ref, index) => {
      if (!ref) return null;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleItems((prev) => new Set([...prev, index]));
            }
          });
        },
        { threshold: 0.1 }
      );
      
      observer.observe(ref);
      return observer;
    });

    return () => {
      observers.forEach((obs) => obs?.disconnect());
    };
  }, []);

  const toggleFAQ = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="space-y-0">
      {faqs.map((faq, index) => (
        <div
          key={faq.id}
          ref={(el) => (itemRefs.current[index] = el)}
          className={`border-b border-white/5 transition-all duration-500 ${
            visibleItems.has(index) ? "scroll-fade-in visible" : "scroll-fade-in"
          }`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <button
            onClick={() => toggleFAQ(faq.id)}
            className="w-full flex items-center justify-between py-4 sm:py-5 text-left group"
          >
            <h4 className="text-sm sm:text-base font-medium text-white group-hover:text-blue-400 transition-colors pr-4">
              {faq.question}
            </h4>
            <ChevronDown
              className={`w-4 h-4 sm:w-5 sm:h-5 text-neutral-400 flex-shrink-0 transition-transform duration-300 ${
                openId === faq.id ? "rotate-180 text-blue-400" : ""
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              openId === faq.id ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="pb-4 sm:pb-5">
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

