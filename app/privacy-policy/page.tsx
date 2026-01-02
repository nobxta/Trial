"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FileText } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4] selection:bg-blue-500/30 selection:text-blue-200">
      <Header />

      <main className="relative z-10 pt-24 pb-12 px-4">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 sm:mb-8">
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6">
              Privacy Policy
            </h1>
            <p className="text-sm sm:text-base text-neutral-500 mb-2">
              Last updated on October 9, 2025
            </p>
          </div>
        </section>

        {/* Privacy Policy Content */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/5 p-8 sm:p-10 lg:p-12">
              <div className="prose prose-invert max-w-none space-y-8 sm:space-y-10">
                
                {/* Section 1: Definitions */}
                <section>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">
                    Section 1
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
                    Definitions
                  </h3>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    In this Privacy Policy (the &quot;Privacy Policy&quot;):
                  </p>
                  <ul className="space-y-4 text-neutral-400">
                    <li>
                      <strong className="text-white">&quot;Cookies&quot;</strong> means data files that are placed on your device or computer and often include an anonymous unique identifier. This data can be used for authentication, identification of a user session, user&apos;s preferences or anything else that can be achieved through storing data on your computer. For more information about cookies, and how to disable cookies, visit <a href="http://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">http://www.allaboutcookies.org</a>.
                    </li>
                    <li>
                      <strong className="text-white">&quot;MintMove&quot;</strong> means a set of related web pages and services located under a single domain named mintmove.io.
                    </li>
                    <li>
                      <strong className="text-white">&quot;Google&quot;</strong> means Google LLC.
                    </li>
                    <li>
                      <strong className="text-white">&quot;Log Files&quot;</strong> means track actions occurring on the MintMove and data including your IP address, browser type, Internet service provider, referring/exit pages, and date/time stamps.
                    </li>
                    <li>
                      <strong className="text-white">&quot;Personal Data&quot;</strong> means (a) data that can be used to identify or made identifiable an individual and (b) Cookies, Log Files, Tags and Pixels.
                    </li>
                    <li>
                      <strong className="text-white">&quot;Tags&quot;</strong> and <strong className="text-white">&quot;Pixels&quot;</strong> means electronic files used to record information about how you browse the MintMove.
                    </li>
                  </ul>
                </section>

                {/* Section 2: General */}
                <section>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">
                    Section 2
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
                    General
                  </h3>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    This Privacy Policy relates to the Personal Data that we collect when you are using our services or visiting MintMove.
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    Personal Data is processed pursuant to the provisions of Regulation (EU) 2016/679 of the European Parliament and of the Council dated 27 April 2016 on the protection of natural persons with regard to the processing of personal data and on the free movement of such data, and repealing Directive 95/46/EC (General Data Protection Regulation) and the Personal Data Protection Act dated 10 May 2018.
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    We would like to assure you that we are committed to the following principles of Personal Data protection:
                  </p>
                  <ul className="space-y-2 text-neutral-400 mb-4">
                    <li>• any Personal Data you provide us with will be secured and will be collected only for the purposes set forth in this Privacy Policy;</li>
                    <li>• we will not rent or sell your Personal Data to any third party;</li>
                    <li>• we are committed to certain principles of Personal Data protection in relation to General Data Protection Regulation effective from 25 May 2018;</li>
                    <li>• we will provide you with the means to contact us regarding any questions or requests relating to this Privacy Policy or Personal Data.</li>
                  </ul>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed">
                    By using our services or visiting MintMove you confirm your agreement with this Privacy Policy. In view of that if you do not agree with this Privacy Policy please kindly do not visit MintMove and do not use our services.
                  </p>
                </section>

                {/* Section 3: Personal Data We Collect */}
                <section>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">
                    Section 3
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
                    Personal Data We Collect
                  </h3>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    If you use our services you may provide us with your e-mail address in order to receive relevant notifications.
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed">
                    When you visit MintMove we automatically collect certain information about your device (i.e. Cookies, Tags and Pixels and Log Files).
                  </p>
                </section>

                {/* Section 4: Processing of Personal Data */}
                <section>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">
                    Section 4
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
                    Processing of Personal Data
                  </h3>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    The Personal Data is processed on the basis of (a) your consent or (b) provisions of law (including any relevant laws and regulations on counteracting money-laundering and terrorism financing) that authorise to process Personal Data.
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    The processing of your collected Personal Data is based on (a) your consent as you provide us with your e-mail address or (b) by visiting MintMove and using our services. You can withdraw your consent at any time by sending a relevant notification to our support service (see section Contact details and rights below).
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    In order for us to provide our services, we will need to undertake collection, recording, organisation, storage, adaptation/alteration, retrieval, consultation, use, disclosure, erasure or destruction of your Personal Data, either among our affiliates or other authorised third parties. MintMove does not collect any sensitive Personal Data about you (i.e. gender, racial origin, financial position).
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    MintMove is concerned with protecting your privacy and has commercially reasonable technical and organizational measures to protect your Personal Data against unlawful or unauthorized access, use, abuse, loss and disclosure and store your Personal Data securely. We will also take all reasonable precautionary steps to ensure that our staff have received adequate training relating to Personal Data protection. Notwithstanding the fact that we use all reasonable efforts to protect your Personal Data, we cannot guarantee the absolute security of your Personal Data provided or collected through MintMove.
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    We may use your Personal Data for the following purposes:
                  </p>
                  <ul className="space-y-2 text-neutral-400 mb-4">
                    <li>• informing you of the status of the exchange;</li>
                    <li>• providing you with supporting documents;</li>
                    <li>• marketing purposes;</li>
                    <li>• improving MintMove and our services.</li>
                  </ul>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    We may retain Personal Data even after the exchange has been completed if retention is reasonably necessary to comply with our obligations under applicable laws, rules and regulations or to meet regulatory requirements, resolve disputes or enforce this Privacy Policy or our obligations. We will retain your Personal Data for a reasonable period or as long as required by applicable laws, rules and regulations.
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed">
                    We do not knowingly and/or intentionally request to collect or collect Personal Data from any under-age individual. If a user submitting Personal Data is suspected of being under-age, we will require to cancel the exchange and will not allow continuing using our services. We will also take steps to delete the Personal Data as soon as possible.
                  </p>
                </section>

                {/* Section 5: Cookies */}
                <section>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">
                    Section 5
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
                    Cookies
                  </h3>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    When you visit MintMove our system automatically collects information about your visit, such as your browser type, your IP address, and the referring website. Such information is typically collected using Cookies, Log Files, Tags and Pixels and similar tools.
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    We use Google Analytics, a web analysis service of Google. Please review their <a href="https://www.google.com/analytics/terms/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Terms of Service</a> and <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Privacy Policy</a>.
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    MintMove uses the Remarketing Lists features of Google Analytics for Display Advertisers. MintMove and Google use first-party cookies (such as the Google Analytics cookie) and third-party cookies (such as the DoubleClick cookie) together to inform, optimize, and serve ads based on your past visits to MintMove. This means that vendors including Google will display MintMove promotional material on other sites you visit across the Internet.
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    We use cookies from third-party partners, such as Google and Facebook, for marketing purposes. MintMove uses Google Analytics to process data about your behavior, age, gender, interests, to show you targeted ads and other content that has been customized for you.
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    You can also opt-out of Google Analytics here: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">https://tools.google.com/dlpage/gaoptout</a>.
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    We also use Google AdWords Conversion Tracking cookie to measure and optimize the performance and user experience related to our ads in Google Search or selected Google Display Network sites. Please review the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">privacy policy here</a>.
                  </p>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed">
                    You can also opt-out of Google AdWords here: <a href="https://adssettings.google.com/authenticated" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">https://adssettings.google.com/authenticated</a>.
                  </p>
                </section>

                {/* Section 6: Reservation of Rights */}
                <section>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">
                    Section 6
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
                    Reservation of Rights
                  </h3>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    We reserve the right to amend this Privacy Policy at any time without prior notice to you. We will process the Personal Data in accordance with the terms of the Privacy Policy that you have consented to at the time of your consent. Upon an update of this Privacy Policy, we will inform you with a banner notice on the MintMove. If you continue to use MintMove, it will constitute and will be considered as your consent to the updated Privacy Policy. Check the date at the beginning of this Privacy Policy to determine when it was last amended.
                  </p>
                </section>

                {/* Section 7: Contact details and Rights */}
                <section>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">
                    Section 7
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
                    Contact details and Rights
                  </h3>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-4">
                    Upon receipt of your request and due review of its merits:
                  </p>
                  <ul className="space-y-2 text-neutral-400 mb-4">
                    <li>• we will provide you with information as to whether and what Personal Data we store in relation to you;</li>
                    <li>• should your Personal Data be incorrect you may have it rectified; and</li>
                    <li>• you may also revoke your consent to use your Personal Data in the future, in whole or in parts, or request deletion of your Personal Data.</li>
                  </ul>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed">
                    If you have any questions or queries about us, our Privacy Policy or your Personal Data please contact us using our support service at <a href="/support" className="text-blue-400 hover:text-blue-300 underline">Support page</a> or at <a href="mailto:support@mintmove.io" className="text-blue-400 hover:text-blue-300 underline">support@mintmove.io</a>.
                  </p>
                </section>

                {/* Footer */}
                <div className="pt-8 mt-8 border-t border-white/5">
                  <p className="text-sm text-neutral-500 text-center">
                    © 2018–2025 MintMove. All rights reserved.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
