// Architecture Governance System - Application Logic
let currentView = 'v1';
let v1Level = 0; // 0=treemap, 1=domain, 2=system, 3=subsystem, 4=profile
let v1Domain = null, v1System = null, v1Subsystem = null, v1App = null;

// === Linked navigation helpers ===
function personLink(name) {
  const p = PERSONS[name];
  if (!p) return name || '未分配';
  return `<a class="entity-link person-link" onclick="event.stopPropagation();showPersonPopup('${name}')">${name}</a>`;
}
function teamLink(name) {
  const t = TEAMS[name];
  if (!t) return name || '未分配';
  return `<a class="entity-link team-link" onclick="event.stopPropagation();showTeamPopup('${name}')">${t.name}</a>`;
}
function renderTags(tags) {
  if (!tags || !tags.length) return '';
  return '<div class="custom-tags">' + tags.map(t => `<span class="custom-tag">${t}</span>`).join('') + '</div>';
}
function renderClassification(entity) {
  let html = '';
  if (entity.classification) { const cls = entity.classification; const clsColor = cls === 'A' ? 'var(--red,#ef4444)' : cls === 'B' ? 'var(--yellow,#f59e0b)' : 'var(--green,#10b981)'; html += `<span class="tag" style="background:${clsColor}20;color:${clsColor};border:1px solid ${clsColor}50">${cls}类</span>`; }
  if (entity.securityLevel) html += `<span class="tag tag-general">🔒${entity.securityLevel}</span>`;
  if (entity.dataLevel) html += `<span class="tag tag-general">📊${entity.dataLevel}</span>`;
  return html;
}
function showPersonPopup(name) {
  const p = PERSONS[name]; if (!p) return;
  closePopup();
  const overlay = document.createElement('div'); overlay.className = 'popup-overlay'; overlay.onclick = closePopup;
  const popup = document.createElement('div'); popup.className = 'popup-panel person-popup fade-in';
  popup.innerHTML = `<div class="popup-close" onclick="closePopup()">✕</div>
    <div class="popup-header"><span class="popup-avatar">${p.photo}</span><div><div class="popup-name">${p.name}</div><div class="popup-subtitle">${p.title} · ${p.role}</div></div></div>
    <div class="popup-body">
      <div class="popup-row"><span class="lbl">部门</span><span>${p.dept}</span></div>
      <div class="popup-row"><span class="lbl">入职时间</span><span>${p.joinDate}</span></div>
      <div class="popup-row"><span class="lbl">邮箱</span><span>${p.email}</span></div>
      <div class="popup-row"><span class="lbl">电话</span><span>${p.phone}</span></div>
      ${p.skills.length ? `<div class="popup-row"><span class="lbl">技能</span><span>${p.skills.map(s => '<span class="custom-tag">' + s + '</span>').join('')}</span></div>` : ''}
      ${p.systems.length ? `<div class="popup-row"><span class="lbl">负责系统</span><span>${p.systems.join('、')}</span></div>` : ''}
    </div>`;
  document.body.appendChild(overlay); document.body.appendChild(popup);
}
function showTeamPopup(name) {
  const t = TEAMS[name]; if (!t) return;
  closePopup();
  const overlay = document.createElement('div'); overlay.className = 'popup-overlay'; overlay.onclick = closePopup;
  const popup = document.createElement('div'); popup.className = 'popup-panel team-popup fade-in';
  popup.innerHTML = `<div class="popup-close" onclick="closePopup()">✕</div>
    <div class="popup-header"><span class="popup-avatar">👥</span><div><div class="popup-name">${t.name}</div><div class="popup-subtitle">${t.dept} · ${t.size}人</div></div></div>
    <div class="popup-body">
      <div class="popup-row"><span class="lbl">负责人</span><span>${personLink(t.leader)}</span></div>
      <div class="popup-row"><span class="lbl">核心成员</span><span>${t.members.map(m => personLink(m)).join('、')}</span></div>
      <div class="popup-row"><span class="lbl">技术栈</span><span>${t.skills.map(s => '<span class="custom-tag">' + s + '</span>').join('')}</span></div>
      <div class="popup-row"><span class="lbl">负责系统</span><span>${t.systems.join('、')}</span></div>
    </div>`;
  document.body.appendChild(overlay); document.body.appendChild(popup);
}
function closePopup() {
  document.querySelectorAll('.popup-overlay,.popup-panel').forEach(e => e.remove());
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  if (view === 'v1') { v1Level = 0; v1Domain = null; v1System = null; v1Subsystem = null; v1App = null; }
  if (view === 'standards') { stdDetailId = null; }
  render();
}

function render() {
  const c = document.getElementById('content');
  const b = document.getElementById('breadcrumb');
  c.innerHTML = '';
  const renderers = { v1: renderV1, v2: renderV2, v3: renderV3, v4: renderV4, v5: renderV5, v6: renderV6, v7: renderV7, v8: renderV8, standards: renderStandards, review: renderReview, dashboard: renderDashboard };
  if (renderers[currentView]) renderers[currentView](c, b);
}

// ========== V1: Business Capability ==========
function renderV1(c, b) {
  if (v1Level === 0) renderV1Treemap(c, b);
  else if (v1Level === 1) renderV1Domain(c, b);
  else if (v1Level === 2) renderV1System(c, b);
  else if (v1Level === 3) renderV1Subsystem(c, b);
  else renderV1Profile(c, b);
}

function renderV1Treemap(c, b) {
  b.innerHTML = '<span onclick="switchView(\'v1\')">全景图</span> &gt; 业务能力视角';
  const total = MOCK.domains.reduce((s, d) => s + d.apps, 0);
  const totalSys = MOCK.domains.reduce((s, d) => s + (MOCK.systems[d.id] || []).length, 0);
  const stats = `<div class="stats-row fade-in">
    <div class="stat-card"><div class="label">业务域</div><div class="value">${MOCK.domains.length}</div></div>
    <div class="stat-card"><div class="label">系统总数</div><div class="value" style="color:var(--cyan)">${totalSys}</div></div>
    <div class="stat-card"><div class="label">应用总数</div><div class="value" style="color:var(--accent2)">${total}</div></div>
    <div class="stat-card"><div class="label">平均合规率</div><div class="value" style="color:var(--green)">${Math.round(MOCK.domains.reduce((s, d) => s + d.compliance, 0) / MOCK.domains.length)}%</div></div>
    <div class="stat-card"><div class="label">告警域</div><div class="value" style="color:var(--yellow)">${MOCK.domains.filter(d => d.health === 'warn').length}</div></div>
  </div>`;
  // Simple treemap layout
  const sorted = [...MOCK.domains].sort((a, b) => b.apps - a.apps);
  let cells = '';
  const positions = [
    { x: 0, y: 0, w: 40, h: 55 }, { x: 40, y: 0, w: 30, h: 55 }, { x: 70, y: 0, w: 30, h: 35 },
    { x: 0, y: 55, w: 25, h: 45 }, { x: 25, y: 55, w: 45, h: 45 }, { x: 70, y: 35, w: 30, h: 30 }, { x: 70, y: 65, w: 30, h: 35 }
  ];
  sorted.forEach((d, i) => {
    if (i >= positions.length) return;
    const p = positions[i];
    const sysCnt = (MOCK.systems[d.id] || []).length;
    const opacity = d.health === 'warn' ? 0.7 : 0.85;
    cells += `<div class="treemap-cell" style="left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%;background:${d.color}${Math.round(opacity * 255).toString(16)}" onclick="drillDomain('${d.id}')">
      <div class="cell-name">${d.name}</div>
      <div class="cell-count">${d.apps}个应用 · ${sysCnt}个系统 · 合规${d.compliance}%</div>
    </div>`;
  });
  c.innerHTML = stats + `<div class="treemap-container fade-in">${cells}</div>`;
}

function drillDomain(domainId) {
  v1Domain = MOCK.domains.find(d => d.id === domainId);
  v1Level = 1;
  render();
}

// Level 1: Domain detail + system list
function renderV1Domain(c, b) {
  b.innerHTML = `<span onclick="switchView('v1')">全景图</span> &gt; <span onclick="v1Level=0;render()">业务能力</span> &gt; ${v1Domain.name}`;
  const d = v1Domain;
  const systems = MOCK.systems[d.id] || [];
  const totalSubsys = systems.reduce((s, x) => s + x.subsystems, 0);

  // Domain profile section
  let html = `<div class="entity-profile fade-in">
    <div class="entity-header" style="border-left:4px solid ${d.color}">
      <div class="entity-title">${d.name} <span class="tag tag-running">${d.status}</span> <span class="tag tag-general">${d.code}</span> <span class="tag tag-important">${d.priority}</span></div>
      <div class="entity-desc">${d.description}</div>
    </div>
    <div class="entity-attrs">
      <div class="attr-group">
        <div class="attr"><span class="lbl">负责人</span><span>${personLink(d.owner)}</span></div>
        <div class="attr"><span class="lbl">架构师</span><span>${personLink(d.architect)}</span></div>
        <div class="attr"><span class="lbl">创建时间</span><span>${d.createdDate}</span></div>
        <div class="attr"><span class="lbl">最近评审</span><span>${d.lastReviewDate}</span></div>
      </div>
      <div class="attr-group">
        <div class="attr"><span class="lbl">业务目标</span><span>${d.bizGoal}</span></div>
        <div class="attr"><span class="lbl">合规率</span><span style="color:${d.compliance >= 90 ? 'var(--green)' : 'var(--yellow)'}">${d.compliance}%</span></div>
        <div class="attr"><span class="lbl">健康状态</span><span class="tag ${d.health === 'good' ? 'tag-running' : 'tag-important'}">${d.health === 'good' ? '●健康' : '●告警'}</span></div>
      </div>
    </div>
  </div>`;

  // Stats
  html += `<div class="stats-row fade-in" style="margin-top:16px">
    <div class="stat-card"><div class="label">系统</div><div class="value" style="color:${d.color}">${systems.length}</div></div>
    <div class="stat-card"><div class="label">子系统</div><div class="value">${totalSubsys}</div></div>
    <div class="stat-card"><div class="label">应用</div><div class="value" style="color:var(--accent2)">${d.apps}</div></div>
  </div>`;

  // System cards
  html += `<h3 style="margin:20px 0 12px;font-size:15px" class="fade-in">📦 下辖系统 (${systems.length})</h3><div class="cards-grid fade-in">`;
  systems.forEach(s => {
    const lvlTag = s.level === 'CORE' ? 'tag-core' : s.level === 'IMPORTANT' ? 'tag-important' : 'tag-general';
    const stTag = s.status === 'RUNNING' ? 'tag-running' : s.status === 'BUILDING' ? 'tag-building' : 'tag-planning';
    html += `<div class="card" onclick="drillSystem('${s.id}')">
      <div class="card-title">${s.name} <span class="tag" style="font-size:10px;opacity:0.7">${s.code}</span></div>
      <div class="card-meta"><span class="tag ${lvlTag}">${s.level}</span><span class="tag ${stTag}">${s.status}</span>${renderClassification(s)}</div>
      <div class="card-stats"><span>📦 ${s.apps}个应用</span><span>📂 ${s.subsystems}个子系统</span><span>👥 ${teamLink(s.team)}</span></div>
      ${renderTags(s.tags)}
      <div class="card-desc">${s.description.substring(0, 50)}...</div>
    </div>`;
  });
  c.innerHTML = html + '</div>';
}

function drillSystem(sysId) {
  const allSystems = Object.values(MOCK.systems).flat();
  v1System = allSystems.find(s => s.id === sysId);
  v1Level = 2;
  render();
}

// Level 2: System detail + subsystem list
function renderV1System(c, b) {
  b.innerHTML = `<span onclick="switchView('v1')">全景图</span> &gt; <span onclick="v1Level=0;render()">业务能力</span> &gt; <span onclick="v1Level=1;render()">${v1Domain.name}</span> &gt; ${v1System.name}`;
  const s = v1System;
  const subsystems = MOCK.subsystems[s.id] || generateSubsystems(s);

  // System profile section
  let html = `<div class="entity-profile fade-in">
    <div class="entity-header" style="border-left:4px solid ${v1Domain.color}">
      <div class="entity-title">${s.name} <span class="tag ${s.level === 'CORE' ? 'tag-core' : s.level === 'IMPORTANT' ? 'tag-important' : 'tag-general'}">${s.level}</span> <span class="tag ${s.status === 'RUNNING' ? 'tag-running' : 'tag-building'}">${s.status}</span> <span class="tag tag-general">${s.code}</span>${renderClassification(s)}</div>
      <div class="entity-desc">${s.description}</div>
      ${renderTags(s.tags)}
    </div>
    <div class="entity-attrs">
      <div class="attr-group">
        <div class="attr"><span class="lbl">业务归属</span><span>${s.owner}</span></div>
        <div class="attr"><span class="lbl">系统架构师</span><span>${personLink(s.architect)}</span></div>
        <div class="attr"><span class="lbl">开发团队</span><span>${teamLink(s.team)} (${s.teamSize}人)</span></div>
        <div class="attr"><span class="lbl">创建时间</span><span>${s.createdDate}</span></div>
      </div>
      <div class="attr-group">
        <div class="attr"><span class="lbl">技术栈</span><span>${s.techStack}</span></div>
        <div class="attr"><span class="lbl">部署方式</span><span>${s.deployMode}</span></div>
        <div class="attr"><span class="lbl">数据中心</span><span>${s.dataCenters}</span></div>
        <div class="attr"><span class="lbl">最近部署</span><span>${s.lastDeployDate}</span></div>
      </div>
    </div>
  </div>`;

  // Stats
  html += `<div class="stats-row fade-in" style="margin-top:16px">
    <div class="stat-card"><div class="label">子系统</div><div class="value" style="color:var(--cyan)">${subsystems.length}</div></div>
    <div class="stat-card"><div class="label">应用总数</div><div class="value" style="color:var(--accent2)">${s.apps}</div></div>
    <div class="stat-card"><div class="label">团队规模</div><div class="value">${s.teamSize}</div></div>
  </div>`;

  // Subsystem cards
  html += `<h3 style="margin:20px 0 12px;font-size:15px" class="fade-in">📂 下辖子系统 (${subsystems.length})</h3><div class="cards-grid fade-in">`;
  subsystems.forEach(sub => {
    const stTag = sub.status === 'RUNNING' ? 'tag-running' : sub.status === 'BUILDING' ? 'tag-building' : 'tag-planning';
    html += `<div class="card" onclick="drillSubsystem('${sub.id}')">
      <div class="card-title">${sub.name} <span class="tag" style="font-size:10px;opacity:0.7">${sub.code}</span></div>
      <div class="card-meta"><span class="tag ${stTag}">${sub.status}</span>${renderClassification(sub)}<span class="tag tag-general">${teamLink(sub.team)}</span></div>
      <div class="card-stats"><span>📦 ${sub.apps}个应用</span><span>🔧 ${sub.techStack.split('/')[0].trim()}</span></div>
      ${renderTags(sub.tags)}
      <div class="card-desc">${sub.description.substring(0, 60)}...</div>
    </div>`;
  });
  c.innerHTML = html + '</div>';
}

function generateSubsystems(sys) {
  const subs = [];
  for (let i = 1; i <= sys.subsystems; i++) {
    subs.push({
      id: `${sys.id}-sub-${i}`,
      name: `${sys.name}子系统${i}`,
      code: `SUB-${sys.code || sys.id.toUpperCase()}-${i}`,
      description: `${sys.name}的第${i}个子系统模块，负责相关业务功能。`,
      owner: sys.architect || '未分配',
      team: `${sys.team}-${String.fromCharCode(64 + i)}`,
      techStack: sys.techStack || 'Java 17 / Spring Boot 3.x',
      status: sys.status,
      createdDate: sys.createdDate || '2023-01-01',
      apps: Math.ceil(sys.apps / sys.subsystems)
    });
  }
  MOCK.subsystems[sys.id] = subs;
  return subs;
}

function drillSubsystem(subId) {
  const allSubs = Object.values(MOCK.subsystems).flat();
  v1Subsystem = allSubs.find(s => s.id === subId);
  v1Level = 3;
  render();
}

// Level 3: Subsystem detail + apps list
function renderV1Subsystem(c, b) {
  b.innerHTML = `<span onclick="switchView('v1')">全景图</span> &gt; <span onclick="v1Level=0;render()">业务能力</span> &gt; <span onclick="v1Level=1;render()">${v1Domain.name}</span> &gt; <span onclick="v1Level=2;render()">${v1System.name}</span> &gt; ${v1Subsystem.name}`;
  const sub = v1Subsystem;
  const apps = MOCK.apps[sub.id] || generateApps(sub);

  // Subsystem profile section
  let html = `<div class="entity-profile fade-in">
    <div class="entity-header" style="border-left:4px solid ${v1Domain.color}">
      <div class="entity-title">${sub.name} <span class="tag ${sub.status === 'RUNNING' ? 'tag-running' : 'tag-building'}">${sub.status}</span> <span class="tag tag-general">${sub.code}</span>${renderClassification(sub)}</div>
      <div class="entity-desc">${sub.description}</div>
      ${renderTags(sub.tags)}
    </div>
    <div class="entity-attrs">
      <div class="attr-group">
        <div class="attr"><span class="lbl">负责人</span><span>${personLink(sub.owner)}</span></div>
        <div class="attr"><span class="lbl">开发团队</span><span>${teamLink(sub.team)}</span></div>
        <div class="attr"><span class="lbl">创建时间</span><span>${sub.createdDate}</span></div>
      </div>
      <div class="attr-group">
        <div class="attr"><span class="lbl">技术栈</span><span>${sub.techStack}</span></div>
        <div class="attr"><span class="lbl">应用数量</span><span style="color:var(--accent2)">${apps.length}</span></div>
        <div class="attr"><span class="lbl">所属系统</span><span>${v1System.name}</span></div>
      </div>
    </div>
  </div>`;

  // Apps list
  html += `<h3 style="margin:20px 0 12px;font-size:15px" class="fade-in">📱 下辖应用 (${apps.length})</h3><div class="app-tree fade-in">`;
  apps.forEach(a => {
    const typeTag = a.type === 'MICROSERVICE' ? 'tag-micro' : a.type === 'SPA' ? 'tag-important' : a.type === 'BATCH' ? 'tag-general' : 'tag-mono';
    html += `<div class="tree-node" onclick="drillApp('${a.id}')">
      <div class="node-name">${a.name} <span class="tag ${typeTag}">${a.type}</span> <span class="tag tag-running">●${a.status}</span>${renderClassification(a)}</div>
      <div class="node-meta">负责人: ${personLink(a.owner)} · ID: ${a.id}</div>
      ${renderTags(a.tags)}
    </div>`;
  });
  c.innerHTML = html + '</div>';
}

function generateApps(sub) {
  const apps = [];
  for (let i = 1; i <= sub.apps; i++) apps.push({ id: `${sub.id}-app-${i}`, name: `${sub.name}服务${i}`, type: i % 3 === 0 ? 'BATCH' : i % 2 === 0 ? 'MONOLITH' : 'MICROSERVICE', status: 'RUNNING', owner: sub.owner || '未分配', gitRepo: `git@bank.com:auto/${sub.id}-app-${i}.git` });
  MOCK.apps[sub.id] = apps;
  return apps;
}

function drillApp(appId) {
  const allApps = Object.values(MOCK.apps).flat();
  v1App = allApps.find(a => a.id === appId);
  v1Level = 4;
  render();
}

// Level 4: App 360° profile
function renderV1Profile(c, b) {
  const subName = v1Subsystem ? v1Subsystem.name : '';
  b.innerHTML = `<span onclick="switchView('v1')">全景图</span> &gt; <span onclick="v1Level=0;render()">业务能力</span> &gt; <span onclick="v1Level=1;render()">${v1Domain.name}</span> &gt; <span onclick="v1Level=2;render()">${v1System.name}</span> &gt; <span onclick="v1Level=3;render()">${subName}</span> &gt; ${v1App.name}`;
  const deps = MOCK.dependencies.filter(d => d.source === v1App.id || d.target === v1App.id);
  c.innerHTML = `<div class="profile-grid fade-in">
    <div class="profile-section"><h3>基本信息</h3>
      <div class="profile-row"><span class="lbl">应用编码</span><span>${v1App.id}</span></div>
      <div class="profile-row"><span class="lbl">应用名称</span><span>${v1App.name}</span></div>
      <div class="profile-row"><span class="lbl">架构类型</span><span class="tag tag-micro">${v1App.type}</span></div>
      <div class="profile-row"><span class="lbl">负责人</span><span>${personLink(v1App.owner)}</span></div>
      <div class="profile-row"><span class="lbl">生命周期</span><span class="tag tag-running">${v1App.status}</span></div>
      <div class="profile-row"><span class="lbl">分级</span><span>${renderClassification(v1App)}</span></div>
      ${v1App.tags ? `<div class="profile-row"><span class="lbl">标签</span><span>${renderTags(v1App.tags)}</span></div>` : ''}
      ${v1App.gitRepo ? `<div class="profile-row"><span class="lbl">Git仓库</span><span style="font-size:12px">${v1App.gitRepo}</span></div>` : ''}
    </div>
    <div class="profile-section"><h3>接口概览</h3>
      <div class="profile-row"><span class="lbl">API Group</span><span>${Math.floor(Math.random() * 5 + 1)}</span></div>
      <div class="profile-row"><span class="lbl">Endpoint</span><span>${Math.floor(Math.random() * 20 + 5)}</span></div>
      <div class="profile-row"><span class="lbl">协议</span><span>REST / DUBBO</span></div>
    </div>
    <div class="profile-section"><h3>依赖关系 (${deps.length})</h3>
      ${deps.map(d => `<div class="profile-row"><span class="lbl">${d.source === v1App.id ? '→ 下游' : '← 上游'}</span><span>${d.source === v1App.id ? d.target : d.source} <span class="tag ${d.type === 'DB_SHARE' ? 'tag-core' : 'tag-general'}">${d.type}</span></span></div>`).join('')}
      ${deps.length === 0 ? '<div style="color:var(--text2);font-size:13px">暂无依赖记录</div>' : ''}
    </div>
    <div class="profile-section"><h3>部署实例</h3>
      <div class="profile-row"><span class="lbl">新数据中心</span><span>2实例</span></div>
      <div class="profile-row"><span class="lbl">灾备数据中心</span><span>1实例</span></div>
    </div>
    <div class="profile-section"><h3>技术组件</h3>
      <div class="profile-row"><span class="lbl">Java 17</span><span class="tag tag-general">RECOMMENDED</span></div>
      <div class="profile-row"><span class="lbl">Spring Boot 3.2</span><span class="tag tag-general">RECOMMENDED</span></div>
      <div class="profile-row"><span class="lbl">MySQL 8.0</span><span class="tag tag-general">RECOMMENDED</span></div>
    </div>
    <div class="profile-section"><h3>合规状态</h3>
      <div class="compliance-result compliance-pass">✅ <a class="rule-link" onclick="event.stopPropagation();showStandard('STD-HA','R001')">R001</a> 核心系统双DC部署</div>
      <div class="compliance-result compliance-pass">✅ <a class="rule-link" onclick="event.stopPropagation();showStandard('STD-SVC','R004')">R004</a> 微服务已注册</div>
      <div class="compliance-result compliance-pass">✅ <a class="rule-link" onclick="event.stopPropagation();showStandard('STD-SVC','R007')">R007</a> 已指定负责人</div>
      <div class="compliance-result compliance-warn">⚠️ <a class="rule-link" onclick="event.stopPropagation();showStandard('STD-SVC','R008')">R008</a> OTel未完全接入</div>
    </div>
  </div>
  <div style="margin-top:16px" class="fade-in"><button class="btn btn-primary btn-lg" onclick="switchView('v2')">🔗 查看依赖图</button></div>`;
}

// ========== V2: Dependency Graph ==========
function renderV2(c, b) {
  b.innerHTML = '<span onclick="switchView(\'v1\')">全景图</span> &gt; 应用依赖视角';
  c.innerHTML = `<div class="graph-container fade-in" id="graphBox">
    <div class="graph-controls">
      <button class="active" onclick="setDepthFilter(0)">全部</button>
      <button onclick="setDepthFilter(1)">1跳</button>
      <button onclick="setDepthFilter(2)">2跳</button>
      <button onclick="highlightDBShare()" style="color:var(--red)">🔴 DB共享</button>
    </div>
    <svg id="depGraph"></svg>
    <div class="impact-panel" id="impactPanel">
      <h3>影响分析</h3>
      <div id="impactContent"></div>
    </div>
  </div>`;
  setTimeout(drawDepGraph, 100);
}

function drawDepGraph() {
  const svg = document.getElementById('depGraph');
  if (!svg) return;
  const box = svg.parentElement.getBoundingClientRect();
  const W = box.width, H = box.height;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const nodes = MOCK.depNodes.map((n, i) => ({ ...n, x: W / 2 + (Math.random() - 0.5) * W * 0.6, y: H / 2 + (Math.random() - 0.5) * H * 0.6, vx: 0, vy: 0 }));
  const nodeMap = {};
  nodes.forEach(n => nodeMap[n.id] = n);
  const links = MOCK.dependencies.filter(d => nodeMap[d.source] && nodeMap[d.target]);

  // Simple force simulation
  for (let iter = 0; iter < 200; iter++) {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
        let d = Math.sqrt(dx * dx + dy * dy) || 1;
        let f = 8000 / (d * d);
        nodes[i].vx -= dx / d * f; nodes[i].vy -= dy / d * f;
        nodes[j].vx += dx / d * f; nodes[j].vy += dy / d * f;
      }
    }
    // Attraction
    links.forEach(l => {
      const s = nodeMap[l.source], t = nodeMap[l.target];
      if (!s || !t) return;
      let dx = t.x - s.x, dy = t.y - s.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      let f = (d - 120) * 0.01;
      s.vx += dx / d * f; s.vy += dy / d * f;
      t.vx -= dx / d * f; t.vy -= dy / d * f;
    });
    // Center
    nodes.forEach(n => { n.vx += (W / 2 - n.x) * 0.001; n.vy += (H / 2 - n.y) * 0.001; });
    // Apply
    nodes.forEach(n => {
      n.vx *= 0.9; n.vy *= 0.9;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(50, Math.min(W - 50, n.x));
      n.y = Math.max(50, Math.min(H - 50, n.y));
    });
  }

  let svgContent = '<defs><marker id="arrow" viewBox="0 0 10 6" refX="25" refY="3" markerWidth="8" markerHeight="6" orient="auto"><path d="M0,0 L10,3 L0,6Z" fill="#64748b"/></marker><marker id="arrowRed" viewBox="0 0 10 6" refX="25" refY="3" markerWidth="8" markerHeight="6" orient="auto"><path d="M0,0 L10,3 L0,6Z" fill="#ef4444"/></marker></defs>';
  // Links
  links.forEach(l => {
    const s = nodeMap[l.source], t = nodeMap[l.target];
    if (!s || !t) return;
    const isDB = l.type === 'DB_SHARE';
    const isAsync = l.type === 'ASYNC_MQ';
    const stroke = isDB ? '#ef4444' : isAsync ? '#64748b' : '#64748b';
    const dash = isAsync ? '6,4' : isDB ? '' : '';
    const width = isDB ? 3 : l.crit === 'HIGH' ? 2 : 1;
    const marker = isDB ? 'url(#arrowRed)' : 'url(#arrow)';
    svgContent += `<line x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} marker-end="${marker}" opacity="0.6" class="dep-link" data-type="${l.type}"/>`;
  });
  // Nodes
  nodes.forEach(n => {
    const conns = links.filter(l => l.source === n.id || l.target === n.id).length;
    const r = 16 + conns * 2;
    const color = DOMAIN_COLORS[n.domain] || '#6366f1';
    svgContent += `<g class="dep-node" style="cursor:pointer" onclick="showImpact('${n.id}')">
      <circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${color}" opacity="0.8" stroke="${color}" stroke-width="2"/>
      <text x="${n.x}" y="${n.y + r + 14}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="Inter">${n.name}</text>
    </g>`;
  });
  svg.innerHTML = svgContent;
}

function showImpact(nodeId) {
  const panel = document.getElementById('impactPanel');
  const node = MOCK.depNodes.find(n => n.id === nodeId);
  const upstream = MOCK.dependencies.filter(d => d.target === nodeId);
  const downstream = MOCK.dependencies.filter(d => d.source === nodeId);
  let html = `<h3 style="margin-bottom:16px">${node?.name || nodeId}</h3>`;
  html += `<div style="font-size:12px;color:var(--text2);margin-bottom:12px">📥 上游 (${upstream.length})</div><ul class="impact-list">`;
  upstream.forEach(d => { html += `<li><span class="tag tag-${d.type === 'DB_SHARE' ? 'core' : 'general'}">${d.type}</span>${MOCK.depNodes.find(n => n.id === d.source)?.name || d.source}</li>`; });
  html += `</ul><div style="font-size:12px;color:var(--text2);margin:12px 0">📤 下游 (${downstream.length})</div><ul class="impact-list">`;
  downstream.forEach(d => { html += `<li><span class="tag tag-${d.type === 'DB_SHARE' ? 'core' : 'general'}">${d.type}</span>${MOCK.depNodes.find(n => n.id === d.target)?.name || d.target}</li>`; });
  html += '</ul>';
  document.getElementById('impactContent').innerHTML = html;
  panel.classList.add('open');
}

function setDepthFilter(d) {
  document.querySelectorAll('.graph-controls button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

function highlightDBShare() {
  document.querySelectorAll('.dep-link').forEach(l => {
    if (l.dataset.type === 'DB_SHARE') { l.setAttribute('opacity', '1'); l.setAttribute('stroke-width', '4'); }
    else { l.setAttribute('opacity', '0.15'); }
  });
}

// ========== V3: Deployment Topology ==========
function renderV3(c, b) {
  b.innerHTML = '<span onclick="switchView(\'v1\')">全景图</span> &gt; 部署拓扑视角';
  let html = '<div class="stats-row fade-in">';
  MOCK.dataCenters.forEach(dc => {
    html += `<div class="stat-card" style="cursor:pointer" onclick="alert('钻取到${dc.name}详情')"><div class="label">${dc.name}</div><div class="value">${dc.apps}</div><div class="sub">应用 ${dc.vms}VM ${dc.containers}容器</div>
      <div style="margin-top:8px;height:6px;background:var(--bg4);border-radius:3px"><div style="width:${dc.usage}%;height:100%;background:${dc.usage > 70 ? 'var(--yellow)' : 'var(--green)'};border-radius:3px"></div></div>
      <div class="sub">${dc.usage}% 资源利用率</div></div>`;
  });
  html += '</div><h3 style="margin:16px 0 12px;font-size:15px" class="fade-in">灾备验证</h3><div class="cards-grid fade-in">';
  html += `<div class="card" style="border-left:3px solid var(--green)"><div class="card-title">✅ 合规</div><div class="card-stats"><span>核心系统双DC部署达标：12/14 (85.7%)</span></div></div>`;
  html += `<div class="card" style="border-left:3px solid var(--red)"><div class="card-title">❌ 违规</div><div class="card-stats"><span>核心银行批量 - 仅在新数据中心</span></div><div class="card-stats"><span>支付对账 - 仅在新数据中心</span></div></div>`;
  html += `<div class="card" style="border-left:3px solid var(--yellow)"><div class="card-title">⚠️ 警告</div><div class="card-stats"><span>CRM报表服务 - IMPORTANT级仅单DC</span></div></div>`;
  c.innerHTML = html + '</div>';
}

// ========== V4: Database ==========
function renderV4(c, b) {
  b.innerHTML = '<span onclick="switchView(\'v1\')">全景图</span> &gt; 数据库视角';
  const types = [...new Set(MOCK.dbClusters.map(d => d.type))];
  let html = '<div class="cluster-tabs fade-in">';
  types.forEach((t, i) => html += `<div class="cluster-tab ${i === 0 ? 'active' : ''}" onclick="filterDB('${t}',this)">${t}</div>`);
  html += '</div><div class="cards-grid fade-in" id="dbCards">';
  MOCK.dbClusters.forEach(db => {
    const drClass = db.dr === 'ok' ? 'dr-ok' : db.dr === 'warn' ? 'dr-warn' : 'dr-none';
    const drText = db.dr === 'ok' ? '🟢灾备正常' : db.dr === 'warn' ? '🟡同步延迟' : '🔴无灾备';
    html += `<div class="card db-card" data-type="${db.type}">
      <div class="card-title">${db.name}</div>
      <div class="card-meta"><span class="tag tag-general">${db.type}</span><span class="tag tag-important">${db.mode}</span><span class="dr-badge ${drClass}">${drText}</span></div>
      <div class="card-stats"><span>💾 ${db.instances}实例</span><span>📦 ${db.apps}个应用</span><span>🏢 ${db.dc}</span></div>
    </div>`;
  });
  c.innerHTML = html + '</div>';
}

function filterDB(type, el) {
  document.querySelectorAll('.cluster-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.db-card').forEach(card => {
    card.style.display = card.dataset.type === type ? '' : 'none';
  });
}

// ========== V5: Middleware ==========
function renderV5(c, b) {
  b.innerHTML = '<span onclick="switchView(\'v1\')">全景图</span> &gt; 中间件视角';
  const types = Object.keys(MOCK.mwClusters);
  let html = '<div class="cluster-tabs fade-in">';
  types.forEach((t, i) => html += `<div class="cluster-tab ${i === 0 ? 'active' : ''}" onclick="filterMW('${t}',this)">${t}</div>`);
  html += '</div><div class="cards-grid fade-in" id="mwCards">';
  Object.entries(MOCK.mwClusters).forEach(([type, clusters]) => {
    clusters.forEach(mw => {
      html += `<div class="card mw-card" data-type="${type}">
        <div class="card-title">${mw.name}</div>
        <div class="card-meta"><span class="tag tag-general">${mw.product}</span><span class="tag ${mw.health === 'healthy' ? 'tag-running' : 'tag-important'}">${mw.health === 'healthy' ? '●健康' : '●告警'}</span></div>
        <div class="card-stats"><span>📡 ${mw.instances}实例</span><span>📤 ${mw.producers}生产者</span><span>📥 ${mw.consumers}消费者</span></div>
      </div>`;
    });
  });
  c.innerHTML = html + '</div>';
}

function filterMW(type, el) {
  document.querySelectorAll('.cluster-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.mw-card').forEach(card => {
    card.style.display = card.dataset.type === type ? '' : 'none';
  });
}

// ========== V6: Traffic Chain ==========
function renderV6(c, b) {
  b.innerHTML = '<span onclick="switchView(\'v1\')">全景图</span> &gt; 流量链路视角';
  c.innerHTML = `<div class="fade-in">
    <div style="max-width:600px;margin-bottom:24px">
      <input class="search-input" style="width:100%;font-size:14px;padding:12px 16px" placeholder="输入域名查询链路，如 card-api.bank.com" value="card-api.bank.com" id="chainSearch">
      <button class="btn btn-primary btn-lg" style="margin-top:8px" onclick="renderChain()">查询链路</button>
    </div>
    <div id="chainResult"></div>
  </div>`;
  renderChain();
}

function renderChain() {
  document.getElementById('chainResult').innerHTML = `
    <h3 style="font-size:15px;margin-bottom:16px">链路追踪</h3>
    <div class="chain">
      <div class="chain-node" style="border-left:3px solid var(--cyan)">🌐 card-api.bank.com</div><div class="chain-arrow">→</div>
      <div class="chain-node">VIP: 10.1.1.100</div><div class="chain-arrow">→</div>
      <div class="chain-node" style="border-left:3px solid var(--yellow)">F5-PROD-01 (LB)</div><div class="chain-arrow">→</div>
      <div class="chain-node" style="border-left:3px solid var(--accent)">Pool: card-api-pool</div>
    </div>
    <div class="chain-members">
      <div class="chain-member"><span class="tag tag-running">●</span>10.2.1.11:8080 → card-apply-svc (运行中)</div>
      <div class="chain-member"><span class="tag tag-running">●</span>10.2.1.12:8080 → card-apply-svc (运行中)</div>
      <div class="chain-member"><span class="tag tag-core">●</span>10.2.1.13:8080 → card-apply-svc (已下线)</div>
    </div>
    <div style="margin-top:24px;padding:12px 16px;background:var(--bg3);border-radius:8px;border-left:3px solid var(--green)">
      <div style="font-size:13px;color:var(--green)">✅ SSL证书有效</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">到期日：2027-03-15 (剩余395天)</div>
    </div>`;
}

// ========== V7: Tech Standards ==========
function renderV7(c, b) {
  b.innerHTML = '<span onclick="switchView(\'v1\')">全景图</span> &gt; 技术标准视角';
  const rec = MOCK.techStandards.filter(t => t.lifecycle === 'RECOMMENDED');
  const allow = MOCK.techStandards.filter(t => t.lifecycle === 'ALLOWED');
  const dep = MOCK.techStandards.filter(t => t.lifecycle === 'DEPRECATED');
  const forb = MOCK.techStandards.filter(t => t.lifecycle === 'FORBIDDEN');

  let radarHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px" class="fade-in">';
  [{ label: '🟢 Adopt (推荐)', items: rec, color: 'var(--green)' }, { label: '🟡 Trial (允许)', items: allow, color: 'var(--yellow)' }, { label: '🟠 Hold (废弃)', items: dep, color: 'var(--yellow)' }, { label: '🔴 Forbid (禁止)', items: forb, color: 'var(--red)' }].forEach(g => {
    radarHtml += `<div class="form-section"><h3 style="color:${g.color}">${g.label}</h3>`;
    g.items.forEach(t => radarHtml += `<div class="profile-row"><span>${t.name}</span><span class="lbl">${t.category} · ${t.users}应用</span></div>`);
    if (!g.items.length) radarHtml += '<div style="color:var(--text2);font-size:13px">无</div>';
    radarHtml += '</div>';
  });
  radarHtml += '</div>';

  radarHtml += '<h3 style="font-size:15px;margin:16px 0 12px" class="fade-in">⚠️ 技术债务清单</h3><div class="fade-in">';
  [...dep, ...forb].forEach(t => {
    radarHtml += `<div class="debt-item"><div class="name">${t.name} <span class="tag ${t.lifecycle === 'FORBIDDEN' ? 'tag-core' : 'tag-important'}">${t.lifecycle}</span></div><div class="apps">仍有 ${t.users} 个应用在使用 · 分类: ${t.category}</div></div>`;
  });
  c.innerHTML = radarHtml + '</div>';
}

// ========== V8: Runtime Drift ==========
function renderV8(c, b) {
  b.innerHTML = '<span onclick="switchView(\'v1\')">全景图</span> &gt; 运行态对比视角';
  const d = MOCK.driftData;
  c.innerHTML = `<div class="drift-grid fade-in">
    <div class="drift-card" style="border-left:3px solid var(--red)"><h3>👻 影子应用</h3><div class="count" style="color:var(--red)">${d.shadow.length}</div>
      <ul class="drift-list">${d.shadow.map(s => `<li>${s.name} <span style="font-size:11px;color:var(--text2)">${s.calls}次调用</span> <button class="btn btn-primary">登记</button></li>`).join('')}</ul></div>
    <div class="drift-card" style="border-left:3px solid var(--yellow)"><h3>🧟 僵尸应用</h3><div class="count" style="color:var(--yellow)">${d.zombie.length}</div>
      <ul class="drift-list">${d.zombie.map(s => `<li>${s.name} <span style="font-size:11px;color:var(--text2)">最后活跃 ${s.lastSeen}</span> <button class="btn btn-outline">标记</button></li>`).join('')}</ul></div>
    <div class="drift-card" style="border-left:3px solid var(--purple)"><h3>🔗 影子依赖</h3><div class="count" style="color:var(--purple)">${d.shadowDep.length}</div>
      <ul class="drift-list">${d.shadowDep.map(s => `<li>${s.from}→${s.to} <span style="font-size:11px;color:var(--text2)">${s.calls}次</span> <button class="btn btn-primary">确认</button></li>`).join('')}</ul></div>
    <div class="drift-card" style="border-left:3px solid var(--text2)"><h3>💀 僵尸依赖</h3><div class="count" style="color:var(--text2)">${d.zombieDep.length}</div>
      <ul class="drift-list">${d.zombieDep.map(s => `<li>${s.from}→${s.to} <span style="font-size:11px;color:var(--text2)">最后 ${s.lastCall}</span> <button class="btn btn-outline">删除</button></li>`).join('')}</ul></div>
  </div>`;
}

// ========== Review: 4-Step Approval Workflow ==========
let reviewStep = 0; // 0=form, 1=check, 2=meeting, 3=result
let reviewFormData = { title: '智能投顾平台新建', appName: '投顾推荐服务', domain: 'retail', system: 'wealth-mgmt', classification: 'A', securityLevel: 'S2', dataLevel: 'L2', level: 'IMPORTANT', archType: 'MICROSERVICE', techStack: 'Java 17 + Spring Boot 3.x', db: 'MySQL 8.0', mq: 'RocketMQ 5.x', deploy: '容器化(K8S)', dc: '新DC+灾备DC', tags: ['核心交易', '实时处理', '信创'], upstream: '渠道接入 (SYNC_API), CRM服务 (SYNC_API)', downstream: '风控引擎 (SYNC_API), 核心银行 (SYNC_API), 通知服务 (ASYNC_MQ)', applicant: '杨华', date: '2026-02-13' };
let reviewChecks = [];
let reviewDecisions = [];
let reviewMeetingId = null;
let reviewVerdict = null;
let reviewMinutes = '';
const ALL_TAGS = ['核心交易', '实时处理', '批量任务', '对外接口', '信创', '7×24', '双活部署', '数据敏感', '跨境业务', 'AI/ML'];

function renderReview(c, b) {
  b.innerHTML = '<span onclick="switchView(\'v1\')">架构评审</span> &gt; 新建应用审批';
  const stepNames = ['📝 填写申请', '🔍 自动检测', '👨‍💼 评审会', '🏁 评审结果'];
  let stepsHtml = '<div class="workflow-steps">';
  stepNames.forEach((name, i) => {
    const cls = i < reviewStep ? 'done clickable' : i === reviewStep ? 'active' : '';
    const click = i < reviewStep ? `onclick="reviewStep=${i};renderReview(document.getElementById('content'),document.getElementById('breadcrumb'))"` : '';
    stepsHtml += `<div class="wf-step ${cls}" ${click}>${name}</div>`;
    if (i < stepNames.length - 1) stepsHtml += '<div class="wf-arrow">→</div>';
  });
  stepsHtml += '</div>';
  c.innerHTML = `<div class="review-form fade-in">${stepsHtml}<div id="reviewBody"></div></div>`;
  const body = document.getElementById('reviewBody');
  if (reviewStep === 0) renderReviewForm(body);
  else if (reviewStep === 1) renderReviewCheck(body);
  else if (reviewStep === 2) renderReviewMeeting(body);
  else renderReviewResult(body);
}

function renderReviewForm(el) {
  const domOpts = MOCK.domains.map(d => `<option value="${d.id}" ${d.id === reviewFormData.domain ? 'selected' : ''}>${d.name}</option>`).join('');
  const tagChecks = ALL_TAGS.map(t => `<label class="tag-check"><input type="checkbox" value="${t}" ${reviewFormData.tags.includes(t) ? 'checked' : ''}><span class="tag-check-label">${t}</span></label>`).join('');
  // Match standards based on classification and tags
  const matchedStds = getMatchedStandards();

  el.innerHTML = `
    <div class="form-section"><h3>📋 基本信息</h3>
      <div class="form-row">
        <div class="form-group"><label>申请标题</label><input value="${reviewFormData.title}" id="rvTitle"></div>
        <div class="form-group"><label>应用名称</label><input value="${reviewFormData.appName}" id="rvAppName"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>归属业务域</label><select id="rvDomain" onchange="updateMatchedStandards()">${domOpts}</select></div>
        <div class="form-group"><label>归属系统</label><select id="rvSystem"><option value="wealth-mgmt">财富管理</option><option value="credit-card">信用卡系统</option><option value="loan-sys">贷款系统</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>申请人</label><input value="${reviewFormData.applicant}" id="rvApplicant"></div>
        <div class="form-group"><label>申请日期</label><input type="date" value="${reviewFormData.date}" id="rvDate"></div>
      </div>
      <div class="form-group"><label>业务背景</label><textarea rows="3" id="rvBg" placeholder="简述业务需求和上线目标...">为零售银行客户提供智能投资顾问服务，基于AI算法推荐理财产品组合。预计2026年Q3上线。</textarea></div>
    </div>
    <div class="form-section"><h3>🏷️ 分级分类 & 标签</h3>
      <div class="form-row">
        <div class="form-group"><label>应用分级</label><select id="rvClass" onchange="updateMatchedStandards()"><option value="A" ${reviewFormData.classification === 'A' ? 'selected' : ''}>A类 - 核心</option><option value="B" ${reviewFormData.classification === 'B' ? 'selected' : ''}>B类 - 重要</option><option value="C" ${reviewFormData.classification === 'C' ? 'selected' : ''}>C类 - 一般</option></select></div>
        <div class="form-group"><label>安全等级</label><select id="rvSec"><option value="S1" ${reviewFormData.securityLevel === 'S1' ? 'selected' : ''}>S1 - 公开</option><option value="S2" ${reviewFormData.securityLevel === 'S2' ? 'selected' : ''}>S2 - 内部</option><option value="S3" ${reviewFormData.securityLevel === 'S3' ? 'selected' : ''}>S3 - 机密</option></select></div>
        <div class="form-group"><label>数据等级</label><select id="rvData"><option value="L1" ${reviewFormData.dataLevel === 'L1' ? 'selected' : ''}>L1 - 一般</option><option value="L2" ${reviewFormData.dataLevel === 'L2' ? 'selected' : ''}>L2 - 敏感</option><option value="L3" ${reviewFormData.dataLevel === 'L3' ? 'selected' : ''}>L3 - 高敏</option></select></div>
      </div>
      <div class="form-group"><label>应用标签</label><div class="tag-checks" id="tagChecks">${tagChecks}</div></div>
    </div>
    <div class="form-section"><h3>📜 适用架构规范</h3>
      <div class="matched-standards" id="matchedStds">${renderMatchedStandards(matchedStds)}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:8px">* 根据应用分级、安全等级和标签自动匹配适用规范</div>
    </div>
    <div class="form-section"><h3>🔧 架构方案</h3>
      <div class="form-row">
        <div class="form-group"><label>架构类型</label><select id="rvArch"><option ${reviewFormData.archType === 'MICROSERVICE' ? 'selected' : ''}>MICROSERVICE</option><option ${reviewFormData.archType === 'MONOLITH' ? 'selected' : ''}>MONOLITH</option><option>SPA</option></select></div>
        <div class="form-group"><label>技术栈</label><select id="rvTech"><option>Java 17 + Spring Boot 3.x</option><option>Go 1.21</option><option>Python 3.11</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>数据库选型</label><select id="rvDB"><option>MySQL 8.0 - 新建集群</option><option>PostgreSQL 16 - 新建集群</option><option>TiDB - 分布式集群</option></select></div>
        <div class="form-group"><label>消息中间件</label><select id="rvMQ"><option>RocketMQ 5.x</option><option>Kafka</option><option>不使用</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>部署方案</label><select id="rvDeploy"><option>容器化 - K8S集群</option><option>虚拟机部署</option></select></div>
        <div class="form-group"><label>数据中心</label><select id="rvDC"><option>新DC + 灾备DC（双DC）</option><option>仅新DC</option></select></div>
      </div>
    </div>
    <div class="form-section"><h3>🔗 依赖关系</h3>
      <div class="form-group"><label>上游依赖（谁调我）</label><input value="${reviewFormData.upstream}" id="rvUp"></div>
      <div class="form-group"><label>下游依赖（我调谁）</label><input value="${reviewFormData.downstream}" id="rvDown"></div>
    </div>
    <div style="text-align:right;margin-top:16px"><button class="btn btn-primary btn-lg" onclick="submitReviewForm()">提交申请 → 运行自动检测</button></div>`;
}

function getMatchedStandards() {
  // Simple matching: A-class gets all, B-class gets most, C-class gets basic
  const cls = reviewFormData.classification || 'B';
  const tags = reviewFormData.tags || [];
  return ARCH_STANDARDS.filter(std => {
    if (std.id === 'STD-HA') return cls === 'A' || cls === 'B';
    if (std.id === 'STD-DDB') return true;
    if (std.id === 'STD-XC') return tags.includes('信创') || cls === 'A';
    if (std.id === 'STD-SEC') return true;
    if (std.id === 'STD-SVC') return true;
    return true;
  });
}

function renderMatchedStandards(stds) {
  if (!stds.length) return '<div style="color:var(--text2)">无匹配规范</div>';
  return stds.map(st => `<div class="matched-std-card">
    <span style="font-size:16px">${st.icon}</span>
    <div><div style="font-weight:600;font-size:13px">${st.name}</div><div style="font-size:11px;color:var(--text2)">${st.rules.length}条规则 · ${st.version}</div></div>
    <span class="tag tag-running" style="font-size:10px;margin-left:auto">适用</span>
  </div>`).join('');
}

function updateMatchedStandards() {
  const cls = document.getElementById('rvClass')?.value || 'B';
  const checked = [...document.querySelectorAll('#tagChecks input:checked')].map(i => i.value);
  reviewFormData.classification = cls;
  reviewFormData.tags = checked;
  const el = document.getElementById('matchedStds');
  if (el) el.innerHTML = renderMatchedStandards(getMatchedStandards());
}

function submitReviewForm() {
  // Collect form data
  reviewFormData.title = document.getElementById('rvTitle')?.value || reviewFormData.title;
  reviewFormData.appName = document.getElementById('rvAppName')?.value || reviewFormData.appName;
  reviewFormData.applicant = document.getElementById('rvApplicant')?.value || reviewFormData.applicant;
  reviewFormData.classification = document.getElementById('rvClass')?.value || 'B';
  reviewFormData.tags = [...document.querySelectorAll('#tagChecks input:checked')].map(i => i.value);
  // Gather applicable rules from matched standards
  const matchedStds = getMatchedStandards();
  const ruleSet = new Map();
  matchedStds.forEach(std => {
    std.rules.forEach(r => { if (!ruleSet.has(r.id)) ruleSet.set(r.id, { ...r, stdId: std.id, stdName: std.name }); });
  });
  // Simulate check results
  reviewChecks = [...ruleSet.values()].map(r => ({
    ...r,
    pass: !['R006', 'R008', 'R013'].includes(r.id),
    exempt: false,
    exemptReason: ''
  }));
  reviewStep = 1;
  renderReview(document.getElementById('content'), document.getElementById('breadcrumb'));
}

function renderReviewCheck(el) {
  const passed = reviewChecks.filter(c => c.pass).length;
  const failed = reviewChecks.filter(c => !c.pass).length;
  let html = `<div class="form-section"><h3>🔍 自动检测结果</h3>
    <div class="check-summary">
      <div class="check-stat"><span class="check-stat-num" style="color:var(--green)">${passed}</span><span>通过</span></div>
      <div class="check-stat"><span class="check-stat-num" style="color:var(--yellow)">${failed}</span><span>未通过</span></div>
      <div class="check-stat"><span class="check-stat-num">${reviewChecks.length}</span><span>总计</span></div>
      <div class="check-stat"><span class="check-stat-num" style="color:${passed === reviewChecks.length ? 'var(--green)' : 'var(--yellow)'}">${Math.round(passed / reviewChecks.length * 100)}%</span><span>通过率</span></div>
    </div>`;

  reviewChecks.forEach((ck, i) => {
    const cls = ck.pass ? 'compliance-pass' : (ck.level === 'CRITICAL' ? 'compliance-fail' : 'compliance-warn');
    const icon = ck.pass ? '✅' : (ck.level === 'CRITICAL' ? '❌' : '⚠️');
    const stdInfo = RULE_STD_MAP[ck.id];
    const ruleLink = stdInfo ? `<a class="rule-link" onclick="showStandard('${stdInfo.stdId}','${ck.id}')">${ck.id}</a>` : `<strong>${ck.id}</strong>`;
    const methodCls = ck.checkMethod === '评审' ? 'check-review' : ck.checkMethod === '测试' ? 'check-test' : 'check-patrol';
    html += `<div class="compliance-result ${cls}" style="flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:8px;flex:1">${icon} ${ruleLink} ${ck.name} <span class="check-method ${methodCls}" style="font-size:10px">${ck.checkMethod}</span><span style="margin-left:auto;font-size:11px">${ck.level}</span></div>
      ${!ck.pass ? `<div class="exemption-row">
        <label class="exemption-label"><input type="checkbox" class="exempt-cb" data-idx="${i}" ${ck.exempt ? 'checked' : ''}> 申请豁免</label>
        <textarea class="exemption-input" data-idx="${i}" placeholder="请填写豁免理由..." ${!ck.exempt ? 'disabled' : ''}>${ck.exemptReason}</textarea>
      </div>` : ''}
    </div>`;
  });

  html += `</div>
  ${failed > 0 ? `<div style="margin-top:12px;padding:12px;background:var(--bg4);border-radius:8px;font-size:13px">
    <div style="color:var(--yellow);font-weight:600;margin-bottom:4px">⚠️ ${failed}项规则未通过，请对需要豁免的项目填写豁免理由</div>
  </div>` : ''}
  <div style="text-align:right;margin-top:16px"><button class="btn btn-primary btn-lg" onclick="submitExemptions()">确认检测结果 → 进入评审会</button></div>`;
  el.innerHTML = html;

  // Wire up exemption checkboxes
  el.querySelectorAll('.exempt-cb').forEach(cb => {
    cb.addEventListener('change', function () {
      const idx = parseInt(this.dataset.idx);
      reviewChecks[idx].exempt = this.checked;
      const ta = el.querySelector(`.exemption-input[data-idx="${idx}"]`);
      if (ta) { ta.disabled = !this.checked; if (this.checked) ta.focus(); }
    });
  });
  el.querySelectorAll('.exemption-input').forEach(ta => {
    ta.addEventListener('input', function () {
      reviewChecks[parseInt(this.dataset.idx)].exemptReason = this.value;
    });
  });
}

function submitExemptions() {
  // Validate: all failed items must be either exempt with reason
  const unhandled = reviewChecks.filter(c => !c.pass && !c.exempt);
  if (unhandled.length > 0) {
    // Allow proceeding but warn
  }
  // Initialize decisions
  reviewDecisions = reviewChecks.map(ck => ({
    ...ck,
    decision: ck.pass ? 'pass' : (ck.exempt ? 'exempt' : 'pending'),
    comment: ''
  }));
  reviewStep = 2;
  renderReview(document.getElementById('content'), document.getElementById('breadcrumb'));
}

function renderReviewMeeting(el) {
  const meetingStatus = reviewMeetingId ? '进行中' : '待发起';
  const meetingBtnText = reviewMeetingId ? `📹 ${reviewMeetingId} (${meetingStatus})` : '📹 发起评审会议';
  const meetingBtnCls = reviewMeetingId ? 'btn btn-outline' : 'btn btn-primary';

  let html = `<div class="form-section meeting-header">
    <h3>👨‍💼 架构评审会</h3>
    <div class="meeting-info">
      <div class="meeting-meta">
        <span>📋 申请编号: <strong>REV-2026-${String(MOCK.reviews.length + 1).padStart(3, '0')}</strong></span>
        <span>📝 ${reviewFormData.title}</span>
        <span>👤 ${personLink(reviewFormData.applicant)}</span>
      </div>
      <button class="${meetingBtnCls}" onclick="createMeeting()" style="white-space:nowrap">${meetingBtnText}</button>
    </div>
  </div>
  <div class="form-section"><h3>📋 逐项评审</h3>
    <table class="review-table" id="decisionTable"><thead><tr>
      <th>规则</th><th>名称</th><th>自检</th><th>豁免理由</th><th>评审意见</th><th>备注</th>
    </tr></thead><tbody>`;

  reviewDecisions.forEach((d, i) => {
    const autoIcon = d.pass ? '✅通过' : (d.exempt ? '🔄已豁免' : '❌未通过');
    const autoCls = d.pass ? 'color:var(--green)' : (d.exempt ? 'color:var(--yellow)' : 'color:var(--red)');
    const stdInfo = RULE_STD_MAP[d.id];
    const ruleLink = stdInfo ? `<a class="rule-link" onclick="showStandard('${stdInfo.stdId}','${d.id}')">${d.id}</a>` : d.id;
    html += `<tr>
      <td>${ruleLink}</td>
      <td style="font-size:12px">${d.name}</td>
      <td style="${autoCls};font-size:12px;white-space:nowrap">${autoIcon}</td>
      <td style="font-size:11px;color:var(--text2);max-width:120px">${d.exemptReason || '—'}</td>
      <td><select class="decision-select" data-idx="${i}" onchange="reviewDecisions[${i}].decision=this.value">
        <option value="pass" ${d.decision === 'pass' ? 'selected' : ''}>✅ 通过</option>
        <option value="exempt" ${d.decision === 'exempt' ? 'selected' : ''}>🔄 豁免</option>
        <option value="fail" ${d.decision === 'fail' ? 'selected' : ''}>❌ 不通过</option>
        <option value="pending" ${d.decision === 'pending' ? 'selected' : ''}>⏳ 待定</option>
      </select></td>
      <td><input class="decision-comment" data-idx="${i}" value="${d.comment}" placeholder="评审备注..." oninput="reviewDecisions[${i}].comment=this.value"></td>
    </tr>`;
  });

  html += `</tbody></table></div>
  <div class="form-section"><h3>📝 总体评审决议</h3>
    <div class="form-row">
      <div class="form-group"><label>评审结论</label><select id="rvVerdict" class="verdict-select">
        <option value="">-- 请选择 --</option>
        <option value="APPROVED">✅ 评审通过</option>
        <option value="REJECTED">❌ 评审不通过</option>
      </select></div>
      <div class="form-group"><label>评审日期</label><input type="date" value="2026-02-13" id="rvVerdictDate"></div>
    </div>
    <div class="form-group"><label>会议纪要</label><textarea rows="4" id="rvMinutes" placeholder="记录评审会讨论要点、决议事项、后续跟进要求..."></textarea></div>
    <div class="form-group"><label>附加意见</label><textarea rows="2" id="rvExtra" placeholder="其他意见或条件..."></textarea></div>
  </div>
  <div style="text-align:right;margin-top:16px"><button class="btn btn-primary btn-lg" onclick="submitReviewDecision()">提交评审决议</button></div>`;
  el.innerHTML = html;
}

function createMeeting() {
  if (!reviewMeetingId) {
    reviewMeetingId = `MTG-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
    renderReview(document.getElementById('content'), document.getElementById('breadcrumb'));
  }
}

function submitReviewDecision() {
  const verdict = document.getElementById('rvVerdict')?.value;
  if (!verdict) { alert('请选择评审结论'); return; }
  reviewVerdict = verdict;
  reviewMinutes = document.getElementById('rvMinutes')?.value || '';
  // Collect final decision comments
  document.querySelectorAll('.decision-comment').forEach(inp => {
    reviewDecisions[parseInt(inp.dataset.idx)].comment = inp.value;
  });
  reviewStep = 3;
  renderReview(document.getElementById('content'), document.getElementById('breadcrumb'));
}

function renderReviewResult(el) {
  const isApproved = reviewVerdict === 'APPROVED';
  const passCount = reviewDecisions.filter(d => d.decision === 'pass').length;
  const exemptCount = reviewDecisions.filter(d => d.decision === 'exempt').length;
  const failCount = reviewDecisions.filter(d => d.decision === 'fail').length;

  let html = `<div class="review-verdict ${isApproved ? 'verdict-pass' : 'verdict-fail'} fade-in">
    <div class="verdict-icon">${isApproved ? '✅' : '❌'}</div>
    <div class="verdict-text">${isApproved ? '评审通过' : '评审未通过'}</div>
    <div class="verdict-sub">${reviewFormData.title} · ${reviewFormData.appName}</div>
  </div>

  <div class="stats-row fade-in" style="margin-top:24px">
    <div class="stat-card"><div class="label">申请人</div><div class="value" style="font-size:18px">${reviewFormData.applicant}</div></div>
    <div class="stat-card"><div class="label">应用分级</div><div class="value" style="font-size:18px">${reviewFormData.classification}类</div></div>
    <div class="stat-card"><div class="label">通过</div><div class="value" style="color:var(--green)">${passCount}</div></div>
    <div class="stat-card"><div class="label">豁免</div><div class="value" style="color:var(--yellow)">${exemptCount}</div></div>
    <div class="stat-card"><div class="label">不通过</div><div class="value" style="color:var(--red)">${failCount}</div></div>
  </div>

  <div class="form-section fade-in" style="margin-top:24px"><h3>📋 检查项明细</h3>
    <table class="review-table"><thead><tr><th>规则</th><th>名称</th><th>自检结果</th><th>豁免理由</th><th>评审意见</th><th>备注</th></tr></thead><tbody>`;

  reviewDecisions.forEach(d => {
    const autoIcon = d.pass ? '✅' : '❌';
    const decIcon = d.decision === 'pass' ? '✅通过' : d.decision === 'exempt' ? '🔄豁免' : d.decision === 'fail' ? '❌不通过' : '⏳待定';
    const decColor = d.decision === 'pass' ? 'var(--green)' : d.decision === 'exempt' ? 'var(--yellow)' : d.decision === 'fail' ? 'var(--red)' : 'var(--text2)';
    const stdInfo = RULE_STD_MAP[d.id];
    const ruleLink = stdInfo ? `<a class="rule-link" onclick="showStandard('${stdInfo.stdId}','${d.id}')">${d.id}</a>` : d.id;
    html += `<tr><td>${ruleLink}</td><td style="font-size:12px">${d.name}</td><td>${autoIcon}</td><td style="font-size:11px;color:var(--text2)">${d.exemptReason || '—'}</td><td style="color:${decColor};font-weight:600">${decIcon}</td><td style="font-size:11px;color:var(--text2)">${d.comment || '—'}</td></tr>`;
  });

  html += '</tbody></table></div>';

  if (reviewMinutes) {
    html += `<div class="form-section minutes-panel fade-in" style="margin-top:24px">
      <h3>📝 会议纪要</h3>
      ${reviewMeetingId ? `<div style="font-size:12px;color:var(--text2);margin-bottom:8px">会议编号: ${reviewMeetingId}</div>` : ''}
      <div class="minutes-content">${reviewMinutes.replace(/\n/g, '<br>')}</div>
    </div>`;
  }

  html += `<div style="text-align:center;margin-top:24px" class="fade-in">
    <button class="btn btn-outline" onclick="reviewStep=0;reviewChecks=[];reviewDecisions=[];reviewMeetingId=null;reviewVerdict=null;reviewMinutes='';switchView('dashboard')">返回评审看板</button>
    <button class="btn btn-primary" onclick="reviewStep=0;reviewChecks=[];reviewDecisions=[];reviewMeetingId=null;reviewVerdict=null;reviewMinutes='';renderReview(document.getElementById('content'),document.getElementById('breadcrumb'))" style="margin-left:12px">新建另一个申请</button>
  </div>`;
  el.innerHTML = html;
}

// ========== Dashboard ==========
function renderDashboard(c, b) {
  b.innerHTML = '<span onclick="switchView(\'v1\')">架构评审</span> &gt; 评审看板';
  const approved = MOCK.reviews.filter(r => r.status === 'APPROVED').length;
  const reviewing = MOCK.reviews.filter(r => r.status === 'REVIEWING').length;
  let html = `<div class="stats-row fade-in">
    <div class="stat-card"><div class="label">评审总数</div><div class="value">${MOCK.reviews.length}</div></div>
    <div class="stat-card"><div class="label">待评审</div><div class="value" style="color:var(--yellow)">${reviewing}</div></div>
    <div class="stat-card"><div class="label">通过率</div><div class="value" style="color:var(--green)">${Math.round(approved / (approved + 1) * 100)}%</div></div>
    <div class="stat-card"><div class="label">平均周期</div><div class="value">4.2</div><div class="sub">天</div></div>
  </div>
  <h3 style="font-size:15px;margin-bottom:12px" class="fade-in">评审列表</h3>
  <table class="review-table fade-in"><thead><tr><th>编号</th><th>标题</th><th>类型</th><th>系统</th><th>等级</th><th>申请人</th><th>日期</th><th>状态</th></tr></thead><tbody>`;
  MOCK.reviews.forEach(r => {
    const stCls = r.status === 'REVIEWING' ? 'status-reviewing' : r.status === 'APPROVED' ? 'status-approved' : r.status === 'REJECTED' ? 'status-rejected' : 'status-draft';
    const stText = r.status === 'REVIEWING' ? '评审中' : r.status === 'APPROVED' ? '已通过' : r.status === 'REJECTED' ? '已驳回' : '草稿';
    const lvlTag = r.level === 'CORE' ? 'tag-core' : r.level === 'IMPORTANT' ? 'tag-important' : 'tag-general';
    html += `<tr><td>${r.id}</td><td><strong>${r.title}</strong></td><td>${r.type}</td><td>${r.system}</td><td><span class="tag ${lvlTag}">${r.level}</span></td><td>${r.applicant}</td><td>${r.date}</td><td><span class="status-tag ${stCls}">${stText}</span></td></tr>`;
  });
  c.innerHTML = html + '</tbody></table>';
}

// ========== Standards View ==========
let stdDetailId = null;
function renderStandards(c, b) {
  if (stdDetailId) { renderStandardDetail(c, b, stdDetailId); return; }
  b.innerHTML = '<span onclick="switchView(\'v1\')">全景图</span> &gt; 架构规范';
  const totalRules = ARCH_STANDARDS.reduce((s, st) => s + st.rules.length, 0);
  const methods = {};
  ARCH_STANDARDS.forEach(st => st.rules.forEach(r => { methods[r.checkMethod] = (methods[r.checkMethod] || 0) + 1; }));
  let html = `<div class="stats-row fade-in">
    <div class="stat-card"><div class="label">规范文档</div><div class="value" style="color:var(--accent)">${ARCH_STANDARDS.length}</div></div>
    <div class="stat-card"><div class="label">检查规则</div><div class="value" style="color:var(--cyan,#06b6d4)">${totalRules}</div></div>
    <div class="stat-card"><div class="label">评审检查</div><div class="value">${methods['评审'] || 0}</div><div class="sub">条</div></div>
    <div class="stat-card"><div class="label">测试检查</div><div class="value">${methods['测试'] || 0}</div><div class="sub">条</div></div>
    <div class="stat-card"><div class="label">巡检检查</div><div class="value">${methods['巡检'] || 0}</div><div class="sub">条</div></div>
  </div>`;
  // Group by category
  const cats = {};
  ARCH_STANDARDS.forEach(st => { if (!cats[st.category]) cats[st.category] = []; cats[st.category].push(st); });
  Object.keys(cats).forEach(cat => {
    html += `<h3 style="margin:24px 0 12px;font-size:15px" class="fade-in">${cat}</h3><div class="cards-grid fade-in">`;
    cats[cat].forEach(st => {
      const methodBadges = [...new Set(st.rules.map(r => r.checkMethod))].map(m => {
        const cls = m === '评审' ? 'check-review' : m === '测试' ? 'check-test' : 'check-patrol';
        return `<span class="check-method ${cls}">${m}</span>`;
      }).join('');
      html += `<div class="card std-card" onclick="stdDetailId='${st.id}';render()">
        <div class="card-title"><span style="font-size:20px;margin-right:6px">${st.icon}</span>${st.name}</div>
        <div class="card-meta"><span class="tag tag-running">${st.status === 'EFFECTIVE' ? '✅生效中' : '草稿'}</span><span class="tag tag-general">${st.version}</span></div>
        <div class="card-stats"><span>📋 ${st.rules.length}条规则</span><span>📖 ${st.chapters.length}个章节</span></div>
        <div style="margin-top:6px">${methodBadges}</div>
        <div class="card-desc">${st.description.substring(0, 60)}...</div>
      </div>`;
    });
    html += '</div>';
  });
  c.innerHTML = html;
}

function renderStandardDetail(c, b, stdId) {
  const std = ARCH_STANDARDS.find(s => s.id === stdId);
  if (!std) return;
  b.innerHTML = `<span onclick="switchView('v1')">全景图</span> &gt; <span onclick="stdDetailId=null;switchView('standards')">架构规范</span> &gt; ${std.name}`;

  let html = `<div class="entity-profile fade-in">
    <div class="entity-header" style="border-left:4px solid var(--accent)">
      <div class="entity-title"><span style="font-size:24px;margin-right:8px">${std.icon}</span>${std.name} <span class="tag tag-running">${std.status === 'EFFECTIVE' ? '✅生效中' : '草稿'}</span> <span class="tag tag-general">${std.code}</span></div>
      <div class="entity-desc">${std.description}</div>
    </div>
    <div class="entity-attrs">
      <div class="attr-group">
        <div class="attr"><span class="lbl">发布日期</span><span>${std.publishDate}</span></div>
        <div class="attr"><span class="lbl">生效日期</span><span>${std.effectiveDate}</span></div>
        <div class="attr"><span class="lbl">版本</span><span>${std.version}</span></div>
      </div>
      <div class="attr-group">
        <div class="attr"><span class="lbl">负责人</span><span>${personLink(std.owner)}</span></div>
        <div class="attr"><span class="lbl">审批方</span><span>${std.approver}</span></div>
        <div class="attr"><span class="lbl">分类</span><span class="tag tag-general">${std.category}</span></div>
      </div>
    </div>
  </div>`;

  // Chapters
  html += `<h3 style="margin:24px 0 12px;font-size:15px" class="fade-in">📖 规范章节 (${std.chapters.length})</h3>
  <div class="std-chapters fade-in">`;
  std.chapters.forEach((ch, i) => {
    html += `<div class="std-chapter" onclick="this.classList.toggle('open')">
      <div class="chapter-title"><span class="chapter-toggle">▶</span>${ch.title}</div>
      <div class="chapter-content">${ch.content}</div>
    </div>`;
  });
  html += '</div>';

  // Rules table
  html += `<h3 style="margin:24px 0 12px;font-size:15px" class="fade-in">📋 关联检查规则 (${std.rules.length})</h3>
  <table class="review-table fade-in" id="rulesTable"><thead><tr><th>规则编号</th><th>规则名称</th><th>级别</th><th>检查方式</th><th>说明</th></tr></thead><tbody>`;
  std.rules.forEach(r => {
    const lvlCls = r.level === 'CRITICAL' ? 'tag-core' : r.level === 'MAJOR' ? 'tag-important' : 'tag-general';
    const methodCls = r.checkMethod === '评审' ? 'check-review' : r.checkMethod === '测试' ? 'check-test' : 'check-patrol';
    html += `<tr id="rule-${r.id}"><td><strong>${r.id}</strong></td><td>${r.name}</td><td><span class="tag ${lvlCls}">${r.level}</span></td><td><span class="check-method ${methodCls}">${r.checkMethod}</span></td><td style="font-size:12px;color:var(--text2)">${r.description}</td></tr>`;
  });
  html += '</tbody></table>';

  c.innerHTML = html;
}

function showStandard(stdId, ruleId) {
  currentView = 'standards';
  stdDetailId = stdId;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector('[data-view="standards"]')?.classList.add('active');
  render();
  // Highlight the rule row after render
  if (ruleId) {
    setTimeout(() => {
      const row = document.getElementById('rule-' + ruleId);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('rule-highlight');
        setTimeout(() => row.classList.remove('rule-highlight'), 3000);
      }
    }, 100);
  }
}

// Init
render();

