// =====================================================================
// HIS Terminal · Module: QUẢN TRỊ HỆ THỐNG (Admin v2)
// Người dùng, vai trò, phân quyền, audit log, cấu hình hệ thống
// =====================================================================

const ADM_ROLES = [
  { v: "admin",     l: "Quản trị hệ thống",   color: "crit", perms: 256 },
  { v: "doctor",    l: "Bác sĩ điều trị",     color: "info", perms: 128 },
  { v: "nurse",     l: "Điều dưỡng",          color: "info", perms: 64 },
  { v: "reception", l: "Tiếp đón",            color: null,   perms: 42 },
  { v: "pharmacist",l: "Dược sĩ",             color: null,   perms: 56 },
  { v: "lab",       l: "KTV xét nghiệm",      color: null,   perms: 48 },
  { v: "cashier",   l: "Thu ngân",            color: null,   perms: 38 },
  { v: "manager",   l: "Quản lý khoa",        color: "warn", perms: 96 },
];

const seedUsers = () => {
  const r = seedRand(54321);
  const list = [];
  const rolesByDept = ["doctor","doctor","nurse","reception","pharmacist","lab","cashier","manager"];
  for (let i = 0; i < 56; i++) {
    const role = i === 0 ? "admin" : rolesByDept[Math.floor(r() * rolesByDept.length)];
    const isOnline = r() > 0.4;
    const isLocked = r() > 0.92;
    list.push({
      id: `U${String(1000 + i).padStart(4,"0")}`,
      username: `user${String(i+1).padStart(3,"0")}`,
      name: i === 0 ? "Nguyễn Quản Trị" : rndName(i),
      role, dept: ["NOI-TM","NOI-TH","SAN","NHI","NGOAI-TH","XN","CDHA","DUOC"][Math.floor(r()*8)],
      email: `user${i+1}@hongduc.vn`,
      phone: rndPhone(),
      lastLogin: new Date(todayIv.getTime() - Math.floor(r()*7*86400000)),
      online: isOnline && !isLocked,
      locked: isLocked,
      created: new Date(2024, Math.floor(r()*12), 1 + Math.floor(r()*28)),
      twoFA: r() > 0.4,
    });
  }
  return list;
};

const seedAudit = () => {
  const r = seedRand(11111);
  const actions = [
    { a: "Đăng nhập thành công", tone: "info" },
    { a: "Đăng nhập thất bại", tone: "warn" },
    { a: "Đổi mật khẩu", tone: "info" },
    { a: "Cập nhật hồ sơ bệnh án", tone: "info" },
    { a: "Tạo đơn thuốc", tone: "info" },
    { a: "Xoá phiếu chỉ định", tone: "crit" },
    { a: "Cấp phát thuốc", tone: "info" },
    { a: "In phiếu thanh toán", tone: "info" },
    { a: "Truy cập trái phép", tone: "crit" },
    { a: "Bật 2FA", tone: "ok" },
    { a: "Khoá tài khoản", tone: "warn" },
    { a: "Mở khoá tài khoản", tone: "info" },
    { a: "Cập nhật danh mục thuốc", tone: "warn" },
  ];
  const list = [];
  for (let i = 0; i < 180; i++) {
    const act = actions[Math.floor(r() * actions.length)];
    const t = new Date(todayIv.getTime() - Math.floor(r() * 5 * 86400000) - Math.floor(r() * 86400000));
    list.push({
      id: `LOG.${String(900000 + i).padStart(7,"0")}`,
      time: t,
      user: `user${String(Math.floor(r()*55)+1).padStart(3,"0")}`,
      ip: `192.168.${Math.floor(r()*255)}.${Math.floor(r()*255)}`,
      action: act.a, tone: act.tone,
      module: rndPick(["EMR","Pharmacy","Billing","OPD","Reception","LIS","RIS","Admin"]),
      target: r() > 0.5 ? rndPid() : "—",
    });
  }
  return list.sort((a,b) => b.time - a.time);
};

function AdminV2() {
  const [tab, setTab] = uS("users");
  return (
    <div className="ab">
      <TopTabs tab={tab} setTab={setTab} tabs={[
        { v: "users",  l: "Người dùng",   ic: "users" },
        { v: "roles",  l: "Vai trò & quyền", ic: "list" },
        { v: "audit",  l: "Audit log",    ic: "file" },
        { v: "config", l: "Cấu hình HT",  ic: "settings" },
      ]}/>
      {tab === "users"  && <UsersTab/>}
      {tab === "roles"  && <RolesTab/>}
      {tab === "audit"  && <AuditTab/>}
      {tab === "config" && <ConfigTab/>}
    </div>
  );
}

const UsersTab = () => {
  const [users, setUsers] = uS(seedUsers);
  const [search, setSearch] = uS("");
  const [roleFilter, setRoleFilter] = uS("");
  const [page, setPage] = uS(0);
  const PER = 18;

  const filtered = uM(() => {
    let r = users;
    if (roleFilter) r = r.filter(u => u.role === roleFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(u => u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return r;
  }, [users, search, roleFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  uE(() => setPage(0), [search, roleFilter]);

  const toggleLock = (u) => { setUsers(p => p.map(x => x.id === u.id ? { ...x, locked: !x.locked } : x)); tk(u.locked ? "Mở khoá" : "Đã khoá " + u.username); };
  const resetPwd = (u) => { tk("Đã reset mật khẩu, gửi mail tới " + u.email); };

  const openDetail = (u) => HUI.drawer(cx => <UserDrawer u={u} cx={cx} onLock={() => { toggleLock(u); cx(); }} onReset={() => { resetPwd(u); cx(); }}/>);

  const cols = [
    { key: "username", label: "Tài khoản", code: true, width: 130 },
    { key: "name", label: "Họ tên", render: r => <div><div style={{fontWeight:600,color:"var(--t-0)"}}>{r.name}</div><div style={{fontSize:11,color:"var(--t-2)"}}>{r.email}</div></div> },
    { key: "role", label: "Vai trò", width: 160, render: r => { const role = ADM_ROLES.find(x => x.v === r.role); return <StatusBadge tone={role.color}>{role.l}</StatusBadge>; }},
    { key: "dept", label: "Khoa", width: 120, mono: true },
    { key: "lastLogin", label: "Đăng nhập gần nhất", width: 160, mono: true, render: r => fmtDTg(r.lastLogin) },
    { key: "twoFA", label: "2FA", width: 70, render: r => r.twoFA ? <span style={{color:"var(--s-ok)",fontSize:11,fontWeight:600}}>BẬT</span> : <span style={{color:"var(--t-2)",fontSize:11}}>Tắt</span> },
    { key: "status", label: "Trạng thái", width: 110, render: r => r.locked ? <StatusBadge tone="crit" dot>Khoá</StatusBadge> : r.online ? <StatusBadge tone="ok" dot>Online</StatusBadge> : <StatusBadge dot>Offline</StatusBadge> },
  ];

  const actions = (r) => (
    <div className="ab-row-act">
      <ActBtn ic="key" title="Reset MK" onClick={() => resetPwd(r)}/>
      <ActBtn ic={r.locked?"check":"x"} tone={r.locked?null:"crit"} title={r.locked?"Mở khoá":"Khoá"} onClick={() => toggleLock(r)}/>
    </div>
  );

  return <>
    <KpiStrip items={[
      { lbl: "Tổng tài khoản", val: users.length },
      { lbl: "Đang online", val: users.filter(u => u.online).length, tone: "ok" },
      { lbl: "Bị khoá", val: users.filter(u => u.locked).length, tone: "crit" },
      { lbl: "Bật 2FA", val: users.filter(u => u.twoFA).length, sub: `${Math.round(users.filter(u=>u.twoFA).length/users.length*100)}%`, tone: "info" },
      { lbl: "Quản trị", val: users.filter(u => u.role === "admin").length, tone: "warn" },
    ]}/>
    <div className="ab-toolbar">
      <SearchBox value={search} onChange={setSearch} placeholder="Tìm tài khoản / tên / email..."/>
      <Filter value={roleFilter} onChange={setRoleFilter} options={ADM_ROLES} placeholder="Mọi vai trò"/>
      <div style={{flex:1}}/>
      <button className="ab-btn primary"><Ico name="plus" size={12}/> Thêm tài khoản</button>
    </div>
    <DataTable columns={cols} data={paged} rowKey={r => r.id} onRowClick={openDetail} actions={actions}/>
    <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
  </>;
};

const UserDrawer = ({ u, cx, onLock, onReset }) => {
  const role = ADM_ROLES.find(r => r.v === u.role);
  return (
    <HUI.Drawer title={u.username} sub={<>{u.name} · <StatusBadge tone={role.color}>{role.l}</StatusBadge></>} width={560} onClose={cx}
      footer={<>
        <button className="ab-btn ghost" onClick={cx}>Đóng</button>
        <button className="ab-btn" onClick={onReset}><Ico name="key" size={12}/> Reset MK</button>
        <button className="ab-btn" style={{color:u.locked?"var(--s-ok)":"var(--s-crit)"}} onClick={onLock}><Ico name={u.locked?"check":"x"} size={12}/> {u.locked?"Mở khoá":"Khoá"}</button>
      </>}>
      <DrSec title="Tài khoản">
        <DrField lbl="ID"><b style={{fontFamily:"var(--font-mono)"}}>{u.id}</b></DrField>
        <DrField lbl="Tên đăng nhập"><b style={{fontFamily:"var(--font-mono)"}}>{u.username}</b></DrField>
        <DrField lbl="Họ tên">{u.name}</DrField>
        <DrField lbl="Email">{u.email}</DrField>
        <DrField lbl="Điện thoại"><span style={{fontFamily:"var(--font-mono)"}}>{u.phone}</span></DrField>
        <DrField lbl="Khoa">{u.dept}</DrField>
        <DrField lbl="2FA">{u.twoFA ? <span style={{color:"var(--s-ok)",fontWeight:600}}>Đã bật</span> : <span style={{color:"var(--t-2)"}}>Chưa bật</span>}</DrField>
      </DrSec>
      <DrSec title="Quyền hạn">
        <div style={{padding:"10px 12px",background:"var(--d-1)",border:"1px solid var(--line)",borderRadius:6,fontSize:13}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{color:"var(--t-2)"}}>Vai trò</span>
            <StatusBadge tone={role.color}>{role.l}</StatusBadge>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{color:"var(--t-2)"}}>Tổng số quyền</span>
            <span style={{fontFamily:"var(--font-mono)",fontWeight:600}}>{role.perms} permission</span>
          </div>
        </div>
      </DrSec>
      <DrSec title="Hoạt động gần đây">
        <DrField lbl="Đăng nhập gần nhất">{fmtDTg(u.lastLogin)}</DrField>
        <DrField lbl="Tạo tài khoản">{fmtDMYg(u.created)}</DrField>
        <DrField lbl="Trạng thái">{u.locked ? <span style={{color:"var(--s-crit)"}}>Đang bị khoá</span> : u.online ? <span style={{color:"var(--s-ok)"}}>Online</span> : "Offline"}</DrField>
      </DrSec>
    </HUI.Drawer>
  );
};

const RolesTab = () => {
  const cols = [
    { key: "v", label: "Mã vai trò", code: true, width: 130 },
    { key: "l", label: "Tên vai trò", render: r => <StatusBadge tone={r.color}>{r.l}</StatusBadge> },
    { key: "perms", label: "Số quyền", width: 130, mono: true, render: r => r.perms },
    { key: "users", label: "Người dùng", width: 130, mono: true, render: r => Math.floor(Math.random()*15+1) + " người" },
  ];
  return <>
    <div className="ab-toolbar">
      <div style={{flex:1}}/>
      <button className="ab-btn primary"><Ico name="plus" size={12}/> Tạo vai trò</button>
    </div>
    <DataTable columns={cols} data={ADM_ROLES} rowKey={r => r.v} onRowClick={() => HUI.alert("Chỉnh sửa vai trò", "Mở giao diện chi tiết với 256 permission, group theo module/action.", "Đóng")}/>
  </>;
};

const AuditTab = () => {
  const [audit] = uS(seedAudit);
  const [search, setSearch] = uS("");
  const [tone, setTone] = uS("");
  const [page, setPage] = uS(0);
  const PER = 25;

  const filtered = uM(() => {
    let r = audit;
    if (tone) r = r.filter(a => a.tone === tone);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(a => a.user.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || a.ip.includes(q) || a.module.toLowerCase().includes(q));
    }
    return r;
  }, [audit, search, tone]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page*PER, (page+1)*PER);
  uE(() => setPage(0), [search, tone]);

  const cols = [
    { key: "id", label: "ID", code: true, width: 130 },
    { key: "time", label: "Thời gian", width: 160, mono: true, render: r => fmtDTg(r.time) },
    { key: "user", label: "Tài khoản", width: 110, mono: true },
    { key: "ip", label: "IP", width: 130, mono: true },
    { key: "module", label: "Module", width: 110, mono: true },
    { key: "action", label: "Hành động", render: r => <span style={{color: r.tone==="crit"?"var(--s-crit)":r.tone==="warn"?"var(--s-warn)":r.tone==="ok"?"var(--s-ok)":"var(--t-1)"}}>{r.action}</span> },
    { key: "target", label: "Đối tượng", width: 110, mono: true },
  ];

  return <>
    <KpiStrip items={[
      { lbl: "Sự kiện 7 ngày", val: audit.length },
      { lbl: "Cảnh báo", val: audit.filter(a => a.tone === "crit").length, tone: "crit" },
      { lbl: "Đăng nhập thất bại", val: audit.filter(a => a.action.includes("thất bại")).length, tone: "warn" },
      { lbl: "Truy cập trái phép", val: audit.filter(a => a.action.includes("trái phép")).length, tone: "crit" },
    ]}/>
    <div className="ab-toolbar">
      <SearchBox value={search} onChange={setSearch} placeholder="Tìm user / IP / hành động..."/>
      <Filter value={tone} onChange={setTone} options={[{v:"info",l:"Info"},{v:"warn",l:"Cảnh báo"},{v:"crit",l:"Nghiêm trọng"},{v:"ok",l:"OK"}]} placeholder="Mọi mức độ"/>
      <div style={{flex:1}}/>
      <button className="ab-btn ghost sm"><Ico name="download" size={12}/> Xuất CSV</button>
    </div>
    <DataTable columns={cols} data={paged} rowKey={r => r.id}/>
    <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER}/>
  </>;
};

const ConfigTab = () => (
  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14,padding:"14px 18px"}}>
    {[
      ["Thông tin cơ sở", [["Tên BV","BV Đa khoa Hồng Đức"],["Mã BHYT","79-005"],["Địa chỉ","123 Lê Lợi, Q.1, TP.HCM"],["Hotline","1900-1234"],["Email","contact@hongduc.vn"]]],
      ["Bảo mật", [["Yêu cầu 2FA","Bật cho admin"],["Hết hạn MK","90 ngày"],["Số lần sai tối đa","5 lần"],["Thời gian khoá","30 phút"],["Session timeout","30 phút"]]],
      ["Tích hợp ngoài", [["BHXH portal","Đã kết nối"],["VietQR","Đã kích hoạt"],["LIS Mindray","Online"],["PACS Carestream","Online"],["SMS Gateway","FPT - Online"]]],
      ["Backup & sao lưu", [["Lịch backup","Hằng ngày 01:00"],["Lưu giữ","30 ngày + 12 tháng cuối tháng"],["Server backup","NAS-02 (offsite)"],["Backup gần nhất","Hôm qua 01:23"],["Dung lượng đã dùng","2.4 TB / 8 TB"]]],
    ].map(([title, rows]) => (
      <div key={title} style={{border:"1px solid var(--line)",background:"var(--d-1)",borderRadius:8,padding:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,paddingBottom:8,borderBottom:"1px solid var(--line)"}}>
          <h4 style={{margin:0,fontSize:12,fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:".06em",color:"var(--t-2)"}}>{title}</h4>
          <button className="ab-btn ghost sm"><Ico name="edit" size={11}/> Sửa</button>
        </div>
        {rows.map(([k,v], i) => (
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom: i < rows.length-1 ? "1px solid var(--line)" : "none",fontSize:13}}>
            <span style={{color:"var(--t-2)"}}>{k}</span>
            <span style={{fontFamily:"var(--font-mono)",fontWeight:500,color:"var(--t-0)"}}>{v}</span>
          </div>
        ))}
      </div>
    ))}
  </div>
);

window.AdminV2 = AdminV2;
