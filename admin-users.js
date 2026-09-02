<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="CONTENT-TYPE" content="text/html; charset=UTF-8">
  <title>Langdex - إدارة المستخدمين</title>

  <!-- CSS -->
  <link rel="stylesheet" href="/Langdex/style.css">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- SheetJS للإكسيل إن لزم -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <!-- مكتبة jsPDF لتصدير الـ PDF -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

  <style>
    /* توحيد العرض والأبعاد لكل الأقسام لتكون متساوية وفي المنتصف بدقة */
    .content > div, header > div, header > nav {
      width: 85% !important;
      max-width: 850px !important;
      margin: 12px auto !important;
      box-sizing: border-box !important;
    }

    /* إصلاح مشاكل الموبايل للنافبار وزر تسجيل الخروج لعدم الخروج عن الحدود */
    @media (max-width: 768px) {
      .content > div, header > div, header > nav {
        width: 92% !important;
        padding: 8px !important;
      }

      nav.bar ul {
        gap: 8px !important;
        flex-wrap: wrap !important;
        padding: 5px 0 !important;
      }

      nav.bar ul a {
        font-size: 12px !important;
        padding: 2px 4px !important;
      }

      .user-bar {
        flex-direction: row-reverse !important;
        justify-content: space-between !important;
        padding: 8px 12px !important;
      }

      #username {
        font-size: 13px !important;
      }

      #logout-btn {
        font-size: 12px !important;
        padding: 6px 12px !important;
      }
    }
  </style>
</head>

<body>

  <!-- ==================================================
       HEADER
  ================================================== -->
  <header>
    <div class="user-bar">
      <span id="username">مرحباً، User</span>
      <button id="logout-btn">تسجيل الخروج</button>
    </div>

    <nav class="bar">
      <ul>
        <a href="/Langdex/admin.html"><li>الرئيسية</li></a>
        <a href="/Langdex/data.html"><li>البيانات</li></a>
        <a href="/Langdex/users.html" class="active"><li>المستخدمين</li></a>
        <a href="#"><li>الإحصائيات</li></a>
        <a href="#"><li>الإعدادات</li></a>
      </ul>
    </nav>
  </header>


  <!-- ==================================================
       DASHBOARD CONTENT
  ================================================== -->
  <div class="content">

    <!-- قسم البحث عن المستخدمين -->
    <div class="search-section" style="width: 100%;">
      <h1>بحث</h1>
      <input type="text" class="search-txt" id="search-user-input" placeholder="اكتب البريد الإلكتروني للبحث...">
    </div>

    <!-- قسم إضافة مستخدم جديد -->
    <div class="form" style="width: 100%;">
      <h1>إضافة مستخدم</h1>
      <input type="email" id="new-user-email" placeholder="البريد الإلكتروني">
      <input type="password" id="new-user-password" placeholder="كلمة المرور (الباسورد)">
      <select id="new-user-role">
        <option value="" disabled selected>اختر الرول (الصلاحية)</option>
        <option value="user">مستخدم عادي (user)</option>
        <option value="admin">مشرف (admin)</option>
      </select>
      <div class="inter1">
        <button type="button" class="reg" id="add-user-btn">حفظ وإضافة</button>
      </div>
    </div>

    <!-- جدول عرض المستخدمين -->
    <div class="data-section" style="width: 100%;">
      <h1>قائمة المستخدمين</h1>
      <div class="table-container" style="width: 95%; margin: 15px auto;">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>البريد الإلكتروني</th>
              <th>الرول</th>
              <th>عدد الكلمات</th>
              <th>اللغات المستخدمة</th>
              <th>الإجراءات والتحكم</th>
            </tr>
          </thead>
          <tbody id="users-table-body">
            <tr><td colspan="6" style="text-align: center;">جاري تحميل بيانات المستخدمين...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>


  <!-- ==================================================
       JAVASCRIPT
  ================================================== -->
  <script type="module" src="/Langdex/auth-guard.js"></script>
  <script type="module" src="/Langdex/user-bar.js"></script>
  <script type="module" src="/Langdex/admin-users.js"></script>

</body>

</html>
