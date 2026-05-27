// HIS Terminal — icon set (1.5px stroke, lucide-style)
// All icons are 16px by default, currentColor stroke.
const HIS_ICONS = (() => {
  const mk = (paths, fill = false) => ({ size = 16, ...rest } = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths}
    </svg>
  );

  return {
    // Navigation
    grid: mk(<>
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </>),
    reception: mk(<>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
      <path d="M19 8v-3M17.5 6.5h3"/>
    </>),
    stethoscope: mk(<>
      <path d="M4 3v5a4 4 0 0 0 8 0V3M8 13v3a4 4 0 0 0 8 0v-1"/>
      <circle cx="18" cy="10" r="2"/>
    </>),
    users: mk(<>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </>),
    folder: mk(<>
      <path d="M4 19a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v2"/>
      <path d="m2 13 1.2 6.4A2 2 0 0 0 5.2 21h13.6a2 2 0 0 0 2-1.6L22 13H2z"/>
    </>),
    flask: mk(<>
      <path d="M10 2v7.5L4.5 18A2 2 0 0 0 6 21h12a2 2 0 0 0 1.5-3L14 9.5V2"/>
      <path d="M9 2h6M7 14h10"/>
    </>),
    scan: mk(<>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
      <path d="M7 12h10"/>
    </>),
    pill: mk(<>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
      <path d="m8.5 8.5 7 7"/>
    </>),
    receipt: mk(<>
      <path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2Z"/>
      <path d="M8 7h8M8 11h8M8 15h5"/>
    </>),
    bed: mk(<>
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20"/>
      <circle cx="7" cy="12" r="2"/>
    </>),
    ambulance: mk(<>
      <path d="M10 17h4M2 17h1M21 17h1"/>
      <path d="M3 7h10v10H3zM13 10h5l3 4v3h-8"/>
      <circle cx="7" cy="17" r="2"/>
      <circle cx="17" cy="17" r="2"/>
      <path d="M8 10v3M6.5 11.5h3"/>
    </>),
    scalpel: mk(<>
      <path d="m14 4 6 6-9 9-4-1-1-4 8-10z"/>
      <path d="m11 8 5 5"/>
    </>),
    calendar: mk(<>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </>),
    chart: mk(<>
      <path d="M3 3v18h18"/>
      <path d="m7 14 4-4 3 3 5-6"/>
    </>),
    box: mk(<>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
    </>),
    settings: mk(<>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </>),
    // Misc
    search: mk(<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>),
    bell: mk(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>),
    plus: mk(<><path d="M12 5v14M5 12h14"/></>),
    check: mk(<><path d="m5 12 5 5 10-11"/></>),
    x: mk(<><path d="M18 6 6 18M6 6l12 12"/></>),
    chevronR: mk(<><path d="m9 18 6-6-6-6"/></>),
    chevronD: mk(<><path d="m6 9 6 6 6-6"/></>),
    arrowR: mk(<><path d="M5 12h14M13 5l7 7-7 7"/></>),
    filter: mk(<><path d="M22 3H2l8 9.5V21l4-2v-6.5z"/></>),
    download: mk(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></>),
    print: mk(<><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></>),
    alert: mk(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></>),
    warn: mk(<><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></>),
    info: mk(<><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>),
    heart: mk(<><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></>),
    activity: mk(<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>),
    droplet: mk(<><path d="M12 2.69 5.64 9.05a9 9 0 1 0 12.72 0z"/></>),
    microscope: mk(<>
      <path d="M6 18h8M3 22h18M14 22a7 7 0 1 0 0-14h-1"/>
      <path d="M9 14h2M8 6h4M12 2v6"/>
      <path d="M8 6v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V6"/>
    </>),
    clipboard: mk(<>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M9 12h6M9 16h4"/>
    </>),
    shield: mk(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>),
    phone: mk(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>),
    eye: mk(<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>),
    clock: mk(<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>),
    refresh: mk(<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5"/></>),
    more: mk(<><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/></>),
    menu: mk(<><path d="M3 6h18M3 12h18M3 18h18"/></>),
    pencil: mk(<><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></>),
    trash: mk(<><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>),
    logout: mk(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>),
    home: mk(<><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></>),
    external: mk(<><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>),
    lock: mk(<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>),
    dna: mk(<>
      <path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M2 9c6.667 6 13.333 0 20 6"/>
      <path d="m17 6-3 3M10 15l-3 3M13 12l-2 2M16 9l-2 2M8 15l-2 2"/>
    </>),
    // Modality badges for RIS
    ct: mk(<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="5"/><path d="M12 7v10M7 12h10"/></>),
    xray: mk(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 6v12M9 9l6 6M15 9l-6 6"/></>),
  };
})();

window.HIS_ICONS = HIS_ICONS;

// Icon sugar: <Ico name="grid" size={18}/>
const Ico = ({ name, size = 16, ...rest }) => {
  const C = HIS_ICONS[name];
  if (!C) return <span style={{display:"inline-block",width:size,height:size}}/>;
  return C({ size, ...rest });
};
window.Ico = Ico;
