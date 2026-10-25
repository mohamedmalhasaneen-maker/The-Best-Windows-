import React from 'react';
import {
  MapPin,
  Navigation,
  Building2,
  Factory,
  Phone,
  MessageCircle,
  ExternalLink,
  QrCode,
  UserCheck,
} from 'lucide-react';
import logoUrl from '../assets/images/the_best_windows_logo.jpeg';
import {
  BRAND_NAME,
  COMPANY_CONTACTS,
  COMPANY_LOCATIONS,
  SOCIAL_CHANNELS,
} from '../constants';
import { renderSocialIcon, getSocialButtonStyle } from './SocialIcons';

interface SectionProps {
  idPrefix?: string;
}

export const BranchesSection: React.FC<SectionProps> = ({ idPrefix = '' }) => {
  return (
    <section
      id={`${idPrefix}branches-section`}
      className="mt-14 sm:mt-20 print:hidden scroll-mt-24 text-right"
      dir="rtl"
    >
      <div className="mb-6 sm:mb-8">
        <p className="text-xs font-bold text-slate-500 mb-1.5">
          المواقع الرسمية المعتمدة · {BRAND_NAME}
        </p>
        <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0F172A] tracking-tight">
          فروعنا ومعارضنا ومصنعنا
        </h2>
        <p className="text-slate-500 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          تفضلوا بزيارة معارضنا وفروعنا أو مقر المصنع لمعاينة قطاعات UPVC و WPC والإكسسوارات المعتمدة على الطبيعة.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {COMPANY_LOCATIONS.map((location) => {
          const isFactory = location.type === 'factory';
          const linkedContact = location.contactId
            ? COMPANY_CONTACTS.find((c) => c.id === location.contactId)
            : undefined;

          return (
            <div
              key={location.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:border-[#F59E0B] transition-colors duration-200 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isFactory
                          ? 'bg-[#0F172A] text-[#FACC15]'
                          : 'bg-slate-100 text-[#0F172A]'
                      }`}
                    >
                      {isFactory ? <Factory size={22} /> : <Building2 size={22} />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {isFactory ? 'المقر الصناعي والإنتاج' : 'فرع ومعرض رسمي'}
                      </p>
                      <h3 className="text-lg sm:text-xl font-display font-black text-[#0F172A] mt-0.5">
                        {location.name}
                      </h3>
                    </div>
                  </div>
                </div>

                {location.address ? (
                  <div className="pt-1 flex items-start gap-2 text-sm text-slate-700 leading-relaxed font-medium">
                    <MapPin size={17} className="text-[#F59E0B] shrink-0 mt-1" />
                    <span>{location.address}</span>
                  </div>
                ) : (
                  <div className="pt-1 flex items-start gap-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                    <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>الموقع الجغرافي متاح مباشرة عبر خرائط Google الرسمية بالأسفل.</span>
                  </div>
                )}

                {linkedContact && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="font-bold">
                      مسؤول الفرع: <strong className="text-slate-900">{linkedContact.name}</strong>
                    </span>
                    <a
                      href={linkedContact.telUrl}
                      className="font-mono tabular-nums font-black text-[#0F172A] hover:underline inline-flex items-center gap-1"
                      dir="ltr"
                    >
                      <Phone size={12} className="text-[#F59E0B]" />
                      <span>{linkedContact.phone}</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <a
                  href={location.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <MapPin size={15} className="text-[#FACC15] shrink-0" />
                  <span>عرض الموقع على الخريطة</span>
                </a>
                <a
                  href={location.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-4 py-2.5 bg-[#FACC15] hover:bg-[#F59E0B] text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <Navigation size={15} className="text-slate-950 shrink-0" />
                  <span>الحصول على الاتجاهات</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const ContactSection: React.FC<SectionProps> = ({ idPrefix = '' }) => {
  return (
    <section
      id={`${idPrefix}contact-section`}
      className="mt-14 sm:mt-20 print:hidden scroll-mt-24 text-right"
      dir="rtl"
    >
      <div className="mb-6 sm:mb-8">
        <p className="text-xs font-bold text-slate-500 mb-1.5">
          خدمة العملاء والمبيعات · {BRAND_NAME}
        </p>
        <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0F172A] tracking-tight">
          تواصل معنا ومسؤولو الفروع والمبيعات
        </h2>
        <p className="text-slate-500 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          تواصل مباشرة مع مهندسي المبيعات ومسؤولي الفروع للاستفسارات الفنية وحجز مواعيد المعاينة ورفع المقاسات.
        </p>
      </div>

      {/* 4 Official Contacts Cards in Exact Order */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {COMPANY_CONTACTS.map((contact, idx) => (
          <div
            key={contact.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:border-[#F59E0B] transition-colors duration-200 flex flex-col justify-between gap-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-[#0F172A] flex items-center justify-center font-mono tabular-nums font-black text-sm shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-display font-black text-[#0F172A]">
                    {contact.name}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                    {contact.role ? contact.role : 'مسؤول التواصل المباشر'}
                  </p>
                </div>
              </div>

              <a
                href={contact.telUrl}
                className="font-mono tabular-nums text-sm sm:text-base font-black text-[#0F172A] hover:underline shrink-0 pt-0.5"
                dir="ltr"
              >
                {contact.phone}
              </a>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100">
              <a
                href={contact.telUrl}
                className="min-h-[44px] px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Phone size={15} className="text-[#FACC15] shrink-0" />
                <span>اتصال مباشر</span>
              </a>

              <a
                href={contact.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="مراسلة عبر واتساب (في حال توفر الخدمة على الرقم)"
                className="min-h-[44px] px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <MessageCircle size={15} className="text-white shrink-0" />
                <span>واتساب</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Official Social Media Bar */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-display font-black text-[#0F172A]">
            صفحاتنا الرسمية على منصات التواصل الاجتماعي
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            تابع أحدث أعمالنا المنفذة وتصميمات الشبابيك والأبواب عبر حسابات {BRAND_NAME} الرسمية.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
          {SOCIAL_CHANNELS.map((social) => (
            <a
              key={social.id}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 whitespace-nowrap shadow-sm ${getSocialButtonStyle(
                social.id
              )}`}
            >
              {renderSocialIcon(social.id, 16)}
              <span>{social.nameAr}</span>
              <ExternalLink size={12} className="opacity-75" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

interface CompanyFooterProps {
  onOpenQr: () => void;
  compactLocations?: boolean;
}

export const CompanyFooter: React.FC<CompanyFooterProps> = ({
  onOpenQr,
  compactLocations = false,
}) => {
  return (
    <footer
      className="mt-16 sm:mt-20 bg-[#0F172A] text-white rounded-3xl p-6 sm:p-10 print:hidden border border-slate-800 text-right"
      dir="rtl"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800">
        {/* Column 1: Brand & Socials */}
        <div className="space-y-4">
          <div className="flex items-center gap-3.5">
            <img
              src={logoUrl}
              alt={`${BRAND_NAME} Logo`}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl border-2 border-[#F59E0B] object-cover bg-white shrink-0"
            />
            <div>
              <h3 className="text-xl font-display font-black text-white tracking-tight">
                {BRAND_NAME}
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                أبواب وشبابيك UPVC & WPC المعتمدة
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            توريد وتصنيع وتركيب أنظمة الأبواب والشبابيك الـ UPVC و WPC بأعلى معايير العزل الحراري والصوتي وضمان معتمد.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {SOCIAL_CHANNELS.map((social) => (
              <a
                key={social.id}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap ${getSocialButtonStyle(
                  social.id
                )}`}
              >
                {renderSocialIcon(social.id, 14)}
                <span>{social.nameAr}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Column 2: Official Phones */}
        <div className="space-y-3">
          <h4 className="text-sm font-black text-[#FACC15]">
            مسؤولو التواصل والمبيعات
          </h4>
          <ul className="space-y-2.5">
            {COMPANY_CONTACTS.map((contact) => (
              <li
                key={contact.id}
                className="flex items-center justify-between gap-2 text-xs border-b border-slate-800/80 pb-2 last:border-none last:pb-0"
              >
                <div className="min-w-0">
                  <span className="font-bold text-white block truncate">
                    {contact.name}
                  </span>
                  {contact.role && (
                    <span className="text-[11px] text-slate-400 block truncate">
                      {contact.role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={contact.telUrl}
                    className="font-mono tabular-nums font-bold text-[#FACC15] hover:underline px-2 py-1 rounded-lg bg-slate-800/90"
                    dir="ltr"
                  >
                    {contact.phone}
                  </a>
                  <a
                    href={contact.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`واتساب ${contact.name}`}
                    className="p-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-white transition-colors"
                  >
                    <MessageCircle size={13} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Branches & Factory */}
        <div className={compactLocations ? 'space-y-2.5' : 'space-y-3'}>
          <h4 className="text-sm font-black text-[#FACC15]">
            الفروع والمعارض والمصنع
          </h4>
          {compactLocations ? (
            <ul className="space-y-2">
              {COMPANY_LOCATIONS.map((loc) => (
                <li
                  key={loc.id}
                  className="flex items-center justify-between gap-2 text-xs border-b border-slate-800/80 pb-2 last:border-none last:pb-0"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-[11px] text-white flex items-center gap-1 truncate">
                      {loc.type === 'factory' ? (
                        <Factory size={11} className="text-[#FACC15] shrink-0" />
                      ) : (
                        <MapPin size={11} className="text-[#FACC15] shrink-0" />
                      )}
                      <span className="truncate">{loc.name}</span>
                    </span>
                    {loc.address && (
                      <span
                        title={loc.address}
                        className="text-[10px] text-slate-400 block truncate mt-0.5"
                      >
                        {loc.address}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={loc.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="عرض الموقع على الخريطة"
                      className="px-2 py-1 bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <MapPin size={11} className="text-[#FACC15] shrink-0" />
                      <span>الخريطة</span>
                    </a>
                    <a
                      href={loc.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="الحصول على الاتجاهات"
                      className="px-2 py-1 bg-[#FACC15] hover:bg-[#F59E0B] text-slate-950 rounded-lg text-[10px] font-black inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <Navigation size={11} className="text-slate-950 shrink-0" />
                      <span>الاتجاهات</span>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {COMPANY_LOCATIONS.map((loc) => (
                <li
                  key={loc.id}
                  className="border-b border-slate-800/80 pb-3 last:border-none last:pb-0 space-y-2"
                >
                  <div>
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      {loc.type === 'factory' ? (
                        <Factory size={13} className="text-[#FACC15] shrink-0" />
                      ) : (
                        <MapPin size={13} className="text-[#FACC15] shrink-0" />
                      )}
                      <span>{loc.name}</span>
                    </span>
                    {loc.address && (
                      <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">
                        {loc.address}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <a
                      href={loc.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[34px] px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <MapPin size={12} className="text-[#FACC15] shrink-0" />
                      <span>عرض الموقع على الخريطة</span>
                    </a>
                    <a
                      href={loc.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[34px] px-2.5 py-1.5 bg-[#FACC15] hover:bg-[#F59E0B] text-slate-950 rounded-lg text-[11px] font-black inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <Navigation size={12} className="text-slate-950 shrink-0" />
                      <span>الحصول على الاتجاهات</span>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bottom Legal & QR Row */}
      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
          <p className="font-bold text-slate-300">
            © {new Date().getFullYear()} {BRAND_NAME} · جميع الحقوق محفوظة
          </p>
          <button
            type="button"
            onClick={onOpenQr}
            className="min-h-[38px] px-3.5 py-1.5 bg-slate-800 hover:bg-[#FACC15] text-white hover:text-slate-950 border border-slate-700 hover:border-transparent transition-colors rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <QrCode size={14} />
            <span>رمز الاستجابة السريعة (QR)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <span>خامات معتمدة</span>
          <span aria-hidden="true">·</span>
          <span>تركيب احترافي</span>
          <span aria-hidden="true">·</span>
          <span>معاينة مجانية</span>
        </div>
      </div>
    </footer>
  );
};
