import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, UserX, UserCheck, Trash2, List, ChevronRight, BellRing, Settings, Lock, Activity, Users, MessageSquare } from 'lucide-react';
import { moderationService, RoleLevel, GlobalRole, ModPermissions } from '../services/moderationService';
import { notificationsService } from '../services/notificationsService';

export default function AdminDashboardView({ onBack }: { onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState<'roles' | 'bans' | 'reports' | 'notifications' | 'settings' | 'stats' | 'mod_perms'>('reports');
  const [role, setRole] = useState<RoleLevel>('user');
  
  const [usersInfo, setUsersInfo] = useState<GlobalRole[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [modPerms, setModPerms] = useState<ModPermissions | null>(null);
  const [appStats, setAppStats] = useState<any>(null);

  // Notifications form state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifType, setNotifType] = useState<string>('system');
  const [notifImageUrl, setNotifImageUrl] = useState('');
  const [notifLinkTo, setNotifLinkTo] = useState('');
  
  const [userIdInput, setUserIdInput] = useState('');
  const [roleInput, setRoleInput] = useState<RoleLevel>('user');

  // UI Settings state
  const [sliderLimit, setSliderLimit] = useState(5);
  const [sliderSeason, setSliderSeason] = useState('auto');

  const [isResettingAll, setIsResettingAll] = useState(false);
  const [resetAllSuccess, setResetAllSuccess] = useState(false);

  const handleResetAllAccounts = async () => {
    const confirmation = window.confirm("⚠️ إجراء فائق الخطورة:\nهل أنت متأكد بنسبة 100% أنك تريد إعادة تهيئة جميع حسابات المستخدمين بالتطبيق بالكامل وتصفير مستوياتهم ونقاطهم وعملاتهم وحذف جميع قوائمهم؟\n\nهذا سيقوم بعملية تصفير شاملة وعميقة ومستدامة لكل حساب في قاعدة البيانات، لا يمكن التراجع عن هذا الإجراء الإداري!");
    if (!confirmation) return;
    
    try {
      setIsResettingAll(true);
      await moderationService.resetAllAccounts();
      setResetAllSuccess(true);
      setTimeout(() => setResetAllSuccess(false), 5000);
      alert('🔒 نجاح: تم تصفير جميع خدمات الحسابات والقوائم بالكامل في قاعدة البيانات!');
      loadData();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء محاولة تصفير كافة الحسابات.');
    } finally {
      setIsResettingAll(false);
    }
  };

  useEffect(() => {
    loadData();
    const savedSliderSettings = JSON.parse(localStorage.getItem('adminSliderSettings') || '{"limit": 5, "season": "auto"}');
    setSliderLimit(savedSliderSettings.limit);
    setSliderSeason(savedSliderSettings.season);
  }, []);

  const saveSliderSettings = () => {
    localStorage.setItem('adminSliderSettings', JSON.stringify({ limit: sliderLimit, season: sliderSeason }));
    alert('تم حفظ إعدادات العرض الشرائحي');
  };

  const loadData = async () => {
    const curRole = await moderationService.getCurrentUserRole();
    setRole(curRole);

    const perms = await moderationService.getModPermissions();
    setModPerms(perms);
    
    if (curRole === 'owner' || curRole === 'admin' || curRole === 'moderator') {
       const stats = await moderationService.getAppStats();
       setAppStats(stats);
       
       const reps = await moderationService.getReports();
       setReports(reps);
    }
    
    if (curRole === 'owner' || curRole === 'admin' || (curRole === 'moderator' && perms.canViewRoles)) {
       const uRole = await moderationService.getAllRoles();
       setUsersInfo(uRole);
    }
    
    if (curRole === 'owner' || curRole === 'admin' || (curRole === 'moderator' && perms.canBan)) {
       const bans = await moderationService.getBannedUsers();
       setBannedUsers(bans);
    }
  };

  const handleAssignRole = async () => {
    if (!userIdInput) return;
    await moderationService.assignRole(userIdInput, roleInput);
    setUserIdInput('');
    loadData();
  };

  const handleBan = async () => {
    if (!userIdInput) return;
    await moderationService.banUser(userIdInput, 'مخالفة القوانين');
    setUserIdInput('');
    loadData();
  };

  const handleUnban = async (uid: string) => {
    await moderationService.unbanUser(uid);
    loadData();
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    
    await notificationsService.createGlobalNotification({
       title: notifTitle,
       body: notifBody,
       type: notifType as any,
       imageUrl: notifImageUrl || undefined,
       linkTo: notifLinkTo || undefined
    });
    
    setNotifTitle('');
    setNotifBody('');
    setNotifImageUrl('');
    setNotifLinkTo('');
    alert('تم إرسال الإشعار بنجاح بنجاح للجميع!');
  };

  if (role === 'user') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl text-center">
          <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">غير مصرح لك بالدخول</h2>
          <p className="text-neutral-400 text-sm">هذه الصفحة مخصصة لنظام الإشراف المتقدم.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen pb-24 text-white">
       <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 pt-12 pb-4">
          <div className="flex items-center gap-3">
             <button onClick={onBack} className="w-10 h-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition">
               <ChevronRight size={24} />
             </button>
             <div>
                <h1 className="text-xl font-black flex items-center gap-2"><Shield className="text-blue-500"/> لوحة الإشراف المتقدمة</h1>
                <p className="text-sm text-neutral-400 mt-1">
                  مستواك الحالي: 
                  <span className={`mr-1 font-bold ${role === 'owner' ? 'text-red-500' : role === 'admin' ? 'text-orange-500' : 'text-blue-500'}`}>
                     {role === 'owner' ? 'مستوى 1 (المالك)' : role === 'admin' ? 'مستوى 2 (مدير)' : 'مستوى 3 (مراقب)'}
                  </span>
                </p>
             </div>
          </div>
       </div>

       <div className="flex px-4 mt-6 gap-2 overflow-x-auto hide-scrollbar">
          {(role === 'owner' || role === 'admin' || (role === 'moderator' && modPerms?.canViewRoles)) && (
            <button 
              onClick={() => setActiveTab('roles')} 
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${activeTab === 'roles' ? 'bg-blue-600' : 'bg-neutral-800 hover:bg-neutral-700'}`}
            >
               إدارة الصلاحيات
            </button>
          )}

          {(role === 'owner' || role === 'admin' || (role === 'moderator' && modPerms?.canBan)) && (
            <button 
              onClick={() => setActiveTab('bans')} 
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${activeTab === 'bans' ? 'bg-blue-600' : 'bg-neutral-800 hover:bg-neutral-700'}`}
            >
               قائمة الحظر
            </button>
          )}

          {(role === 'owner' || role === 'admin' || (role === 'moderator' && modPerms?.canNotify)) && (
            <button 
              onClick={() => setActiveTab('notifications')} 
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${activeTab === 'notifications' ? 'bg-blue-600' : 'bg-neutral-800 hover:bg-neutral-700'}`}
            >
               إرسال إشعار عام
            </button>
          )}

          {(role === 'owner' || role === 'admin' || (role === 'moderator' && modPerms?.canManageSettings)) && (
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${activeTab === 'settings' ? 'bg-blue-600' : 'bg-neutral-800 hover:bg-neutral-700'}`}
            >
               إعدادات الواجهة
            </button>
          )}

          <button 
            onClick={() => setActiveTab('reports')} 
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${activeTab === 'reports' ? 'bg-blue-600' : 'bg-neutral-800 hover:bg-neutral-700'}`}
          >
             المحتوى المخالف
          </button>
          
          <button 
            onClick={() => setActiveTab('stats')} 
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${activeTab === 'stats' ? 'bg-green-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}
          >
             إحصائيات عالم التطبيق
          </button>

          {(role === 'owner' || role === 'admin') && (
            <button 
              onClick={() => setActiveTab('database_reset')} 
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border border-red-500/25 transition block md:inline-block ${activeTab === 'database_reset' ? 'bg-red-600 font-bold text-white' : 'bg-red-950/15 text-red-400 hover:bg-neutral-800'}`}
              type="button"
            >
               إعادة تهيئة الحسابات 🔄
            </button>
          )}

          {(role === 'owner' || role === 'admin') && (
            <button 
              onClick={() => setActiveTab('mod_perms')} 
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${activeTab === 'mod_perms' ? 'bg-purple-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}
            >
               صلاحيات المشرفين مخصص
            </button>
          )}
       </div>

       <div className="p-4 mt-4">
          {activeTab === 'roles' && (role === 'owner' || role === 'admin') && (
            <div className="space-y-6">
              <div className="bg-[#121212] p-4 rounded-xl border border-neutral-800">
                 <h3 className="text-lg font-bold mb-4">تعيين صلاحية جديدة</h3>
                 <div className="flex flex-col md:flex-row gap-3">
                   <input type="text" placeholder="UID الخاص بالمستخدم" value={userIdInput} onChange={e => setUserIdInput(e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-black transition" />
                   <select value={roleInput} onChange={e => setRoleInput(e.target.value as RoleLevel)} className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-black transition appearance-none">
                     <option value="user">مستخدم عادي</option>
                     <option value="moderator">مراقب (صلاحية محدودة)</option>
                     {role === 'owner' && <option value="admin">مدير (صلاحية عالية)</option>}
                     {role === 'owner' && <option value="owner">المالك</option>}
                   </select>
                   <button onClick={handleAssignRole} className="bg-blue-600 hover:bg-blue-500 font-bold px-6 py-2 rounded-lg transition text-sm">
                      تنفيذ
                   </button>
                 </div>
              </div>

              <div className="bg-[#121212] p-4 rounded-xl border border-neutral-800">
                 <h3 className="text-lg font-bold mb-4">قائمة المشرفين</h3>
                 <div className="space-y-2">
                   {usersInfo.map(u => (
                     <div key={u.uid} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-lg gap-2">
                        <div>
                          <p className="font-bold text-sm text-neutral-200">{u.uid}</p>
                          <p className="text-xs text-neutral-500 mt-1">
                             الصلاحية: <span className={u.role === 'owner' ? 'text-red-400' : u.role === 'admin' ? 'text-orange-400' : 'text-blue-400'}>{u.role}</span>
                          </p>
                        </div>
                        {role === 'owner' || (role === 'admin' && u.role === 'moderator') ? (
                          <button onClick={() => { setUserIdInput(u.uid); setRoleInput('user'); handleAssignRole(); }} className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600/40 px-3 py-1.5 rounded-lg border border-red-600/20 transition self-start md:self-auto">
                            سحب الصلاحية
                          </button>
                        ) : null}
                     </div>
                   ))}
                   {usersInfo.length === 0 && <p className="text-sm text-neutral-500 text-center py-4">لا يوجد مشرفين حالياً.</p>}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'bans' && (role === 'owner' || role === 'admin') && (
            <div className="space-y-6">
              <div className="bg-[#121212] p-4 rounded-xl border border-neutral-800">
                 <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><UserX className="text-red-500"/> حظر مستخدم</h3>
                 <div className="flex flex-col md:flex-row gap-3">
                   <input type="text" placeholder="UID الخاص بالمستخدم المخالف" value={userIdInput} onChange={e => setUserIdInput(e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-red-500 focus:bg-black transition" />
                   <button onClick={handleBan} className="bg-red-600 hover:bg-red-500 font-bold px-6 py-2 rounded-lg transition text-sm">
                      حظر نهائي
                   </button>
                 </div>
              </div>

              <div className="bg-[#121212] p-4 rounded-xl border border-neutral-800">
                 <h3 className="text-lg font-bold mb-4">قائمة المحظورين</h3>
                 <div className="space-y-2">
                   {bannedUsers.map(b => (
                     <div key={b.uid} className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                        <div className="text-sm text-neutral-300 font-mono">{b.uid}</div>
                        <button onClick={() => handleUnban(b.uid)} className="text-xs bg-green-600/20 text-green-400 hover:bg-green-600/40 px-3 py-1.5 rounded-lg border border-green-600/20 transition flex items-center gap-1">
                          <UserCheck size={14}/> فك الحظر
                        </button>
                     </div>
                   ))}
                   {bannedUsers.length === 0 && <p className="text-sm text-neutral-500 text-center py-4">لا يوجد مستخدمين محظورين.</p>}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
             <div className="bg-[#121212] p-6 rounded-xl border border-neutral-800">
                <h3 className="text-lg font-bold mb-4">البلاغات والمحتوى المخالف</h3>
                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <div className="text-center py-8">
                       <ShieldCheck size={48} className="mx-auto text-green-500 mb-4 opacity-50" />
                       <h2 className="text-xl font-bold mb-2">النظام نظيف</h2>
                       <p className="text-sm text-neutral-400">لا توجد بلاغات معلقة.</p>
                    </div>
                  ) : (
                    reports.map(report => (
                      <div key={report.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex justify-between items-center flex-wrap gap-2">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                             <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                               {report.status === 'pending' ? 'بانتظار المراجعة' : 'تمت المراجعة'}
                             </span>
                             <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold">
                               {report.contentType === 'comment' ? 'تعليق' : 'توصية'}
                             </span>
                             <span className="text-[10px] text-neutral-500">{report.contentId}</span>
                           </div>
                           <p className="text-sm font-bold text-white">السبب: {report.reason}</p>
                           <p className="text-xs text-neutral-500">تم التبليغ بواسطة: {report.reporterId}</p>
                        </div>
                        {report.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => moderationService.resolveReport(report.id, 'dismissed').then(loadData)} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-bold text-neutral-300 transition">
                              تجاهل
                            </button>
                            <button onClick={() => moderationService.resolveReport(report.id, 'deleted_content').then(loadData)} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded-lg text-xs font-bold transition">
                              حذف المحتوى
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
             </div>
          )}

          {activeTab === 'notifications' && (role === 'owner' || role === 'admin') && (
            <div className="bg-[#121212] p-6 rounded-xl border border-neutral-800 space-y-4">
               <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                 <BellRing className="text-blue-500" /> إرسال إشعار تفاعلي عام للجميع
               </h3>
               
               <input 
                 type="text" 
                 placeholder="عنوان الإشعار (مثال: نزال الحلقات الأسبوعي!)" 
                 value={notifTitle} 
                 onChange={e => setNotifTitle(e.target.value)} 
                 className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-black transition text-white" 
               />
               
               <textarea 
                 placeholder="تفاصيل الإشعار (مثال: شارك في التصويت على أفضل حلقة هذا الأسبوع...)" 
                 value={notifBody} 
                 onChange={e => setNotifBody(e.target.value)} 
                 rows={3}
                 className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-black transition text-white resize-none" 
               />
               
               <div className="flex flex-col md:flex-row gap-3">
                 <select 
                   value={notifType} 
                   onChange={e => setNotifType(e.target.value)} 
                   className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-black transition appearance-none text-white text-right"
                 >
                   <option value="system">🔔 إشعار نظام عام</option>
                   <option value="episode">🎬 حلقة جديدة متوفرة</option>
                   <option value="anime">✨ أنمي جديد متوفر بالمنصة</option>
                   <option value="season_end">🏁 انتهاء الموسم الحالي</option>
                   <option value="anime_status">💥 بداية أو انتهاء أنمي</option>
                   <option value="tournament">🏆 نزال أو بطولة جديدة</option>
                   <option value="reward">🎁 مكافآت ومهمات للتحدي</option>
                 </select>
                 
                 <input 
                   type="text" 
                   placeholder="رابط صورة الغلاف أو الأيقونة (اختياري)" 
                   value={notifImageUrl} 
                   onChange={e => setNotifImageUrl(e.target.value)} 
                   className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-black transition text-white" 
                 />
               </div>

               <div className="space-y-2">
                 <label className="block text-xs font-bold text-neutral-400">الرابط التفاعلي للأكشن / التوجيه:</label>
                 <input 
                   type="text" 
                   placeholder="الرابط التوجيهي (مثال: anime_details:123 أو watch_episode:123:5 أو rewards)" 
                   value={notifLinkTo} 
                   onChange={e => setNotifLinkTo(e.target.value)} 
                   className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-black transition text-white font-mono" 
                 />
                 
                 <div className="flex flex-wrap gap-2 pt-1">
                   <button 
                     type="button"
                     onClick={() => { setNotifLinkTo('rewards'); setNotifType('reward'); }} 
                     className="text-[10px] bg-neutral-900 hover:bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 font-bold transition cursor-pointer"
                   >
                     🚀 صفحة الجوائز والمهام
                   </button>
                   <button 
                     type="button"
                     onClick={() => { setNotifLinkTo('games'); setNotifType('reward'); }} 
                     className="text-[10px] bg-neutral-900 hover:bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 font-bold transition cursor-pointer"
                   >
                     🎮 صفحة الألعاب
                   </button>
                   <button 
                     type="button"
                     onClick={() => { setNotifLinkTo('leaderboard'); setNotifType('tournament'); }} 
                     className="text-[10px] bg-neutral-900 hover:bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 font-bold transition cursor-pointer"
                   >
                     🏆 لوحة الصدارة المتكاملة
                   </button>
                   <button 
                     type="button"
                     onClick={() => { setNotifLinkTo('anime_details:50265'); setNotifType('anime'); }} 
                     className="text-[10px] bg-neutral-900 hover:bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 font-bold transition cursor-pointer"
                   >
                     🎬 أنمي محدد (مثال)
                   </button>
                 </div>
               </div>
               
               <button 
                 onClick={handleSendNotification} 
                 disabled={!notifTitle.trim() || !notifBody.trim()}
                 className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 font-bold px-6 py-3 rounded-lg transition text-sm mt-2 select-none"
               >
                  إرسال الإشعار التفاعلي الآن للجميع
               </button>
            </div>
           )}

           {activeTab === 'settings' && (role === 'owner' || role === 'admin') && (
            <div className="bg-[#121212] p-6 rounded-xl border border-neutral-800 space-y-4">
               <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                 <Settings className="text-orange-500" /> إعدادات العرض الشرائحي (السلايدر)
               </h3>
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-bold text-neutral-400 mb-2">عدد الأنميات المعروضة (Top N)</label>
                   <input type="number" value={sliderLimit} onChange={e => setSliderLimit(Number(e.target.value))} min={1} max={10} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 focus:bg-black transition text-white" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-neutral-400 mb-2">الموسم المعروض</label>
                   <select value={sliderSeason} onChange={e => setSliderSeason(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 focus:bg-black transition text-white appearance-none">
                     <option value="auto">تلقائي (الموسم الحالي)</option>
                     <option value="winter">الشتاء</option>
                     <option value="spring">الربيع</option>
                     <option value="summer">الصيف</option>
                     <option value="fall">الخريف</option>
                   </select>
                 </div>
               </div>

               <button 
                 onClick={saveSliderSettings} 
                 className="w-full bg-orange-600 hover:bg-orange-500 font-bold px-6 py-3 rounded-lg transition text-sm mt-2"
               >
                  حفظ الإعدادات
               </button>
            </div>
           )}

           {activeTab === 'stats' && (
            <div className="bg-[#121212] p-6 rounded-xl border border-neutral-800 space-y-6">
               <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                 <Activity className="text-green-500" /> إحصائيات عالم التطبيق
               </h3>
               
               {appStats ? (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                     <Users size={32} className="text-blue-500 mb-2" />
                     <span className="text-2xl font-black text-white">{appStats.totalUsers}</span>
                     <span className="text-xs text-neutral-400 font-bold mt-1">المستخدمين المسجلين</span>
                   </div>
                   <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                     <ShieldCheck size={32} className="text-purple-500 mb-2" />
                     <span className="text-2xl font-black text-white">{appStats.totalRoles}</span>
                     <span className="text-xs text-neutral-400 font-bold mt-1">مشرفين و مدراء</span>
                   </div>
                   <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                     <UserX size={32} className="text-red-500 mb-2" />
                     <span className="text-2xl font-black text-white">{appStats.totalBans}</span>
                     <span className="text-xs text-neutral-400 font-bold mt-1">حسابات محظورة</span>
                   </div>
                   <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                     <MessageSquare size={32} className="text-yellow-500 mb-2" />
                     <span className="text-2xl font-black text-white">{appStats.totalComments}</span>
                     <span className="text-xs text-neutral-400 font-bold mt-1">تعليقات المنصة</span>
                   </div>
                 </div>
               ) : (
                 <p className="text-center text-neutral-500 py-8">جاري تحميل الإحصائيات...</p>
               )}
            </div>
           )}

           {activeTab === 'database_reset' && (role === 'owner' || role === 'admin') && (
            <div className="bg-[#121212] p-6 rounded-xl border border-neutral-800 space-y-4 text-right font-sans" dir="rtl">
              <h3 className="text-lg font-black flex items-center gap-2 text-red-500 mb-2">
                <span>⚠️ إدارة النظام: إعادة تهيئة وتصفير كافة الحسابات</span>
              </h3>
              
              <div className="bg-red-950/20 border border-red-500/20 p-5 rounded-xl space-y-4">
                <p className="text-sm text-red-400 font-bold leading-relaxed">
                  تنبيه هام جداً: هذا الإجراء يقوم بتصفير جميع حسابات المستخدمين في قاعدة البيانات دفعة واحدة وإرجاعها للبداية كلياً!
                </p>
                <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
                  <li>سيتم حذف جميع سجلات تتبع الأنميات وقوائم المشاهدة والمفضلة لجميع الحسابات نهائياً.</li>
                  <li>سيتم إعادة ضبط نقاط الخبرة (XP) إلى 0 لجميع الحسابات.</li>
                  <li>سيتم إعادة ضبط مستويات الحساب (Level) إلى 1 للجميع.</li>
                  <li>سيتم تصفير رصيد عملات الأوتاكو (Coins) لجميع الحسابات.</li>
                  <li>سيتم سحب ومسح كافة العناصر التي قام المستخدمون بشرائها من المتجر لتكون البداية عادلة.</li>
                </ul>
                
                <div className="pt-2">
                  <button
                    disabled={isResettingAll || resetAllSuccess}
                    onClick={handleResetAllAccounts}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-650 font-bold text-white px-6 py-3 rounded-lg transition text-xs flex justify-center items-center gap-2 cursor-pointer shadow-lg shadow-red-500/10 hover:scale-[1.01] active:scale-95 text-center"
                  >
                    {isResettingAll ? 'جاري إعادة تهيئة وتفتيت البيانات لكافة الحسابات...' : resetAllSuccess ? '✓ تم تصفير جميع الحسابات بنجاح!' : 'تأكيد تصفير وإعادة تهيئة كافة الحسابات كلياً 🔄'}
                  </button>
                </div>
                {resetAllSuccess && (
                  <p className="text-xs text-green-400 text-center font-bold animate-pulse mt-2">
                    🎉 تمت إعادة التهيئة الشاملة لجميع الحسابات بنجاح تام!
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'mod_perms' && (role === 'owner' || role === 'admin') && (
            <div className="bg-[#121212] p-6 rounded-xl border border-neutral-800 space-y-6">
               <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                 <Lock className="text-purple-500" /> تخصيص صلاحيات فئة "مراقب"
               </h3>
               <p className="text-sm text-neutral-400 mb-6">حدد ما يمكن للمراقبين (المشرفين من المستوى 3) الوصول إليه وإدارته داخل لوحة التحكم.</p>

               {modPerms ? (
                 <div className="space-y-4">
                   <label className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-4 cursor-pointer hover:bg-neutral-800 transition">
                     <input 
                       type="checkbox" 
                       checked={modPerms.canBan}
                       onChange={e => setModPerms({...modPerms, canBan: e.target.checked})}
                       className="w-5 h-5 rounded border-neutral-700 text-purple-600 focus:ring-purple-600 focus:ring-offset-neutral-900 bg-neutral-800"
                     />
                     <div>
                       <p className="font-bold text-white text-sm">إدارة الحظر (قائمة الحظر)</p>
                       <p className="text-xs text-neutral-500 mt-1">يسمح للمراقب بحظر المستخدمين لارتكابهم مخالفات.</p>
                     </div>
                   </label>

                   <label className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-4 cursor-pointer hover:bg-neutral-800 transition">
                     <input 
                       type="checkbox" 
                       checked={modPerms.canNotify}
                       onChange={e => setModPerms({...modPerms, canNotify: e.target.checked})}
                       className="w-5 h-5 rounded border-neutral-700 text-purple-600 focus:ring-purple-600 focus:ring-offset-neutral-900 bg-neutral-800"
                     />
                     <div>
                       <p className="font-bold text-white text-sm">إرسال إشعارات عامة</p>
                       <p className="text-xs text-neutral-500 mt-1">يسمح للمراقب بإرسال إشعارات لجميع مستخدمي التطبيق.</p>
                     </div>
                   </label>

                   <label className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-4 cursor-pointer hover:bg-neutral-800 transition">
                     <input 
                       type="checkbox" 
                       checked={modPerms.canViewRoles}
                       onChange={e => setModPerms({...modPerms, canViewRoles: e.target.checked})}
                       className="w-5 h-5 rounded border-neutral-700 text-purple-600 focus:ring-purple-600 focus:ring-offset-neutral-900 bg-neutral-800"
                     />
                     <div>
                       <p className="font-bold text-white text-sm">عرض قائمة المشرفين</p>
                       <p className="text-xs text-neutral-500 mt-1">السماح لهم برؤية مدراء ومشرفين التطبيق (بدون صلاحية التعديل).</p>
                     </div>
                   </label>

                   <label className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-4 cursor-pointer hover:bg-neutral-800 transition">
                     <input 
                       type="checkbox" 
                       checked={modPerms.canManageSettings}
                       onChange={e => setModPerms({...modPerms, canManageSettings: e.target.checked})}
                       className="w-5 h-5 rounded border-neutral-700 text-purple-600 focus:ring-purple-600 focus:ring-offset-neutral-900 bg-neutral-800"
                     />
                     <div>
                       <p className="font-bold text-white text-sm">تغيير إعدادات الواجهة</p>
                       <p className="text-xs text-neutral-500 mt-1">يسمح بالتحكم في إعدادات العرض مثل السلايدر الرئيسي.</p>
                     </div>
                   </label>

                   <button 
                     onClick={async () => {
                       await moderationService.updateModPermissions(modPerms);
                       alert('تم حفظ صلاحيات المراقبين بنجاح');
                     }}
                     className="w-full bg-purple-600 hover:bg-purple-500 font-bold px-6 py-3 rounded-lg transition text-sm mt-4"
                   >
                      حفظ تخصيص الصلاحيات
                   </button>
                 </div>
               ) : (
                 <p className="text-center text-neutral-500 py-8">جاري تحميل الإعدادات...</p>
               )}
            </div>
           )}
       </div>
    </div>
  );
}
