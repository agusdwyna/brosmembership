PRD — BROs Membership MVP

1. Overview

BROs Membership adalah sistem internal untuk mengelola member, membership, kartu membership, template kartu, dan verifikasi kartu.

Core flow:

Member → Membership → Card → Scan → Verification → Scan History

MVP harus sederhana, reliable, profesional, minimalis, dan mudah dikembangkan.

2. Goals

Mengelola master membership.

Mengelola template kartu depan dan belakang.

Mendaftarkan member.

Saat member dibuat dan membership dipilih, kartu otomatis diterbitkan.

Mendukung QR Code atau barcode.

Mendukung scan melalui input manual, physical reader, dan kamera HP.

Menampilkan hasil verification secara langsung.

Menyimpan scan history.

Menyediakan dashboard operasional dasar.

SSO-ready dan memiliki role/permission dasar.

3. Stack

Frontend

React

TypeScript

Vite

React Router

Zustand

Zod

React Hook Form

Tailwind CSS

shadcn/ui

Backend

Node.js

Express

TypeScript

Zod

Prisma ORM

Database

PostgreSQL

Deployment

Docker

Coolify

Authentication

SSO-ready

OAuth 2.0 / OpenID Connect

4. MVP Scope

Master

Membership Types

Card Templates

Member

Member CRUD

Member detail

Membership information

Card information

Membership

Create membership

Active/suspended/expired/cancelled lifecycle

Renewal

Membership history

Card

Automatic issuance

QR/barcode

Preview

Print/reprint

Revoke

Replace

Card history

Scanner

Manual input

Physical USB/Bluetooth reader

Camera HP

Verification result

History

Scan history

Result

Officer

Timestamp

Scanner method

Dashboard

Total members

Active memberships

Expiring soon

Today's scans

Recent verification

Auth

Login

Role/permission

SSO-ready

5. Out of Scope MVP

Payment/payment gateway

Subscription billing

Public member portal

Native mobile application

Loyalty point

Coupon

Advanced CRM

Advanced BI

Marketing automation

Complex notification system

SaaS multi-tenancy

Photoshop-like card designer

Advanced graphics/animation

6. Core Entities

User
Member
MembershipType
Membership
CardTemplate
CardTemplateElement
MembershipCard
ScanHistory

Relationship:

Member
  │
  └──< Membership
           │
           ├── MembershipType
           │
           └──< MembershipCard
                    │
                    └── CardTemplate

Principle:

Member ≠ Membership ≠ Card.

7. Membership Type

Contoh:

Silver
Gold
Platinum

Fields:

id

code

name

description

duration

status

defaultCardTemplateId

createdAt

updatedAt

Rules:

Code unique.

Inactive type tidak dapat dipilih untuk membership baru.

Satu type dapat memiliki default template.

8. Card Template

Template terdiri dari:

FRONT
BACK

Admin dapat:

Create template.

Upload front design.

Upload back design.

Tambahkan dynamic component.

Drag/move component.

Resize component.

Edit basic properties.

Preview.

Save.

Dynamic components MVP:

MEMBER_NAME
MEMBER_NUMBER
MEMBERSHIP_NAME
EXPIRY_DATE
PHOTO
QR_CODE
BARCODE

Basic properties:

x

y

width

height

fontSize

fontWeight

alignment

MVP bukan full graphic design editor.

9. Member

Fields minimal:

id

memberNumber

fullName

phone

email

photo

address

status

createdAt

updatedAt

Status:

ACTIVE
INACTIVE

Member number harus unique.

10. Create Member Flow

UX menggunakan satu proses:

Tambah Member
 ↓
Isi Data Member
 ↓
Pilih Membership Type
 ↓
Tentukan Start Date
 ↓
System menghitung End Date
 ↓
Review
 ↓
Simpan & Terbitkan Kartu

Admin tidak perlu membuat membership dan card secara manual setelah membuat member.

Backend:

Create Member
 ↓
Create Membership
 ↓
Get Default Card Template
 ↓
Generate Card Number
 ↓
Generate Secure Token
 ↓
Create Card

Gunakan transaction.

11. Membership

Membership adalah hubungan member dengan membership type pada periode tertentu.

Fields:

id

memberId

membershipTypeId

startDate

endDate

status

createdAt

updatedAt

Status:

ACTIVE
SUSPENDED
EXPIRED
CANCELLED

Rules:

ACTIVE dan tanggal masih berlaku → dapat diverifikasi.

SUSPENDED → tidak valid.

EXPIRED → tidak valid.

CANCELLED → tidak valid.

Renewal tidak membuat member baru.

Histori membership harus tetap tersimpan.

12. Membership Card

Card adalah entity terpisah dari member.

Fields:

id

membershipId

cardNumber

secureToken

cardTemplateId

templateVersion

status

issuedAt

revokedAt

createdAt

Status MVP:

ACTIVE
REVOKED

Card tidak perlu status EXPIRED. Validitas ditentukan dari card + membership.

Card ACTIVE
+
Membership ACTIVE
+
Tanggal masih berlaku
=
VALID

13. Card Lifecycle

Normal:

Membership ACTIVE
 ↓
Card ACTIVE

Kartu hilang/rusak:

Card #001 ACTIVE
 ↓
REVOKE
 ↓
Card #001 REVOKED
 ↓
Issue Replacement
 ↓
Card #002 ACTIVE

Membership tetap aktif.

Membership cancelled/expired membuat verification gagal meskipun card record masih ada.

14. Renewal

Renewal tidak membuat member baru.

Contoh:

Agus
 ├── Gold 2025 → EXPIRED
 └── Gold 2026 → ACTIVE

Histori tetap tersimpan.

Kartu baru saat renewal hanya dibuat jika business rule mengharuskannya.

15. QR / Barcode

QR/barcode hanya berisi opaque identifier atau secure token.

Tidak boleh berisi:

NIK

password

nomor telepon

data pribadi lengkap

Token harus sulit ditebak.

MVP boleh memilih satu format terlebih dahulu, tetapi architecture harus memungkinkan format kedua.

16. Scanner

Tiga input method:

Manual

[ Card Identifier ] [ Verify ]

Physical Reader

USB/Bluetooth reader yang bertindak seperti keyboard:

Reader → Input Field → Auto Verify

Camera HP

HP Browser
 ↓
Camera
 ↓
QR/Barcode Detection
 ↓
Token
 ↓
Verification

Scanner tetap pada satu halaman dan dapat langsung melakukan scan berikutnya.

17. Verification

Endpoint:

POST /api/scanner/verify

Flow:

Find Card
 ↓
Not found → NOT_FOUND
 ↓
Card revoked → REVOKED
 ↓
Find Membership
 ↓
Suspended → SUSPENDED
Cancelled → CANCELLED
Expired → EXPIRED
 ↓
Valid → VALID

Result MVP:

VALID
EXPIRED
REVOKED
SUSPENDED
CANCELLED
NOT_FOUND

Backend adalah source of truth.

18. Verification UI

Valid:

✓ MEMBERSHIP VALID

Agus Dwiyana
MB-00128

Gold Membership
Active
Valid until 18 Aug 2027

Card ••••1824

Invalid harus menampilkan alasan:

MEMBERSHIP EXPIRED

atau:

CARD REVOKED

atau:

CARD NOT FOUND

19. Scan History

Setiap verification dicatat.

Fields minimal:

id

memberId nullable

membershipId nullable

cardId nullable

result

reason

scannerMethod

officerId

createdAt

Scanner method:

MANUAL
PHYSICAL_READER
CAMERA

Scan NOT_FOUND tetap dapat dicatat.

20. Dashboard

KPI:

Total Members
Active Memberships
Expiring Soon
Today's Scans

Sections:

Membership Overview

Today's Activity

Recent Verification Activity

Recent verification columns:

Member
Membership
Card
Result
Time
Officer

Empty state harus compact, bukan memenuhi seluruh halaman.

21. Reports

MVP reports:

Verification activity

Total scans

Successful scans

Failed scans

Result breakdown

Scan history

Filter:

Today
Last 7 Days
Last 30 Days
Custom Date Range

22. Member Detail

Member detail menjadi pusat informasi:

Profile
Current Membership
Current Card
Membership History
Card History
Verification History

Actions:

Edit

Renew membership

Change membership type

Print card

23. Card Management

Kartu tidak punya menu tersendiri. Kartu diterbitkan otomatis saat member
didaftarkan (dan saat renewal/change-type) dan dikelola dari halaman Member:

Current Card (nomor, template + versi, tanggal terbit)

Preview depan/belakang

Print

Card History

Card lama tidak dihapus ketika diterbitkan kartu baru.

24. UI/UX

Brand menggunakan BROS Hospital.

Primary green:

#1F6B4E

Accent gold:

#D4AF37

Neutral:

Background #F5F7F6
Surface    #FFFFFF
Border     #E2E8E5
Text       #17231D
Secondary  #66736B

Design direction:

Professional

Minimalist

Simple

Institutional

Trustworthy

Calm

Information-dense tanpa crowded

Hindari:

gradients

excessive shadows

terlalu banyak warna

excessive rounded cards

decorative UI

excessive whitespace

generic admin-template feeling

Gold hanya accent. Green adalah brand color utama.

25. Shared Components

Semua module menggunakan shared component yang konsisten.

Minimal:

Button
Input
Textarea
Select
Combobox
DatePicker
Modal
Drawer
Dialog
Dropdown
Tabs
Badge
Card
Table
Pagination
Breadcrumb
PageHeader
EmptyState
LoadingState
ErrorState
ConfirmDialog
StatusBadge
SearchInput
FilterBar

Jangan membuat ulang component yang secara behavior dan visual sama di setiap module.

Business-specific component tetap berada di module masing-masing.

26. Module Architecture

Frontend:

features/
├── auth/
├── members/
├── memberships/
├── membership-types/
├── card-templates/
├── cards/
├── scanner/
├── scan-history/
├── dashboard/
└── reports/

Backend:

modules/
├── auth/
├── members/
├── memberships/
├── membership-types/
├── card-templates/
├── cards/
├── scanner/
├── scan-history/
├── dashboard/
└── reports/

Setiap module memiliki responsibility yang jelas.

Backend module:

module/
├── routes.ts
├── controller.ts
├── service.ts
├── repository.ts
├── schema.ts
└── types.ts

Flow:

Route
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Prisma
 ↓
PostgreSQL

27. State Management

Zustand hanya untuk client state.

Contoh:

scannerStore
uiStore

Server data tetap berasal dari REST API.

28. Validation

Zod digunakan pada frontend dan backend.

React Form
 ↓
Zod
 ↓
REST API
 ↓
Zod
 ↓
Controller
 ↓
Service

Frontend validation bukan security boundary.

29. Authentication & Authorization

MVP harus SSO-ready.

Authentication:

SSO / OAuth 2.0 / OIDC

Authorization:

User
 ↓
Role
 ↓
Permission

Backend adalah security boundary.

30. API Convention

Contoh:

GET    /api/members
POST   /api/members
GET    /api/members/:id
PUT    /api/members/:id

GET    /api/membership-types
POST   /api/membership-types
PUT    /api/membership-types/:id

GET    /api/memberships
POST   /api/memberships
POST   /api/memberships/:id/renew
POST   /api/memberships/:id/suspend
POST   /api/memberships/:id/cancel

GET    /api/card-templates
POST   /api/card-templates
PUT    /api/card-templates/:id

POST   /api/scanner/verify
GET    /api/scan-history

GET    /api/dashboard
GET    /api/reports/verifications

31. Security MVP

Protected API membutuhkan authentication.

Authorization diverifikasi backend.

Input divalidasi Zod.

Token aman dan sulit ditebak.

QR/barcode tidak berisi sensitive data.

Rate limiting scanner bila diperlukan.

CORS dikonfigurasi.

Secrets menggunakan environment variables.

Database errors tidak diekspos.

Sensitive token tidak dicatat penuh di log.

32. Transactions

Create Member

Create Member
+
Create Membership
+
Create Card

Replace Card

Revoke Old Card
+
Create New Card

Jika salah satu gagal:

ROLLBACK

33. Testing MVP

Prioritas business-critical logic.

Unit:

Active membership → VALID
Expired membership → EXPIRED
Suspended membership → SUSPENDED
Cancelled membership → CANCELLED
Revoked card → REVOKED
Unknown token → NOT_FOUND

Integration:

Create Member → Membership → Card
Scan → Verification → Scan History

E2E:

Login
 ↓
Create Member
 ↓
Select Membership
 ↓
Card Issued
 ↓
Scan
 ↓
VALID

TDD tidak wajib untuk semua fitur MVP.

34. MVP Acceptance Criteria

Membership

Admin dapat CRUD Membership Type.

Duration dapat ditentukan.

Inactive type tidak dapat dipilih.

Card Template

Upload front.

Upload back.

Add dynamic component.

Drag component.

Resize component.

Edit basic properties.

Preview.

Save template.

Member

Create member.

Member number unique.

Edit/detail member.

Membership terlihat pada detail.

Membership

Membership dipilih saat create member.

End date dihitung backend.

Lifecycle bekerja.

Renewal mempertahankan histori.

Card

Card otomatis dibuat.

Card number unique.

QR/barcode tersedia.

Preview/print.

Revoke.

Replace.

History.

Scanner

Manual input.

Physical reader.

Camera HP.

Tidak perlu pindah halaman setelah scan.

Backend melakukan verification.

Result dan reason ditampilkan.

History

Scan tersimpan.

Officer tersimpan.

Timestamp tersimpan.

Scanner method tersimpan.

Dashboard

KPI tampil.

Recent verification tampil.

Security

Authentication.

Backend authorization.

Zod validation.

Secure token.

No sensitive token logging.

35. Primary MVP Flow

Membership Type
      +
Card Template
      ↓
  Add Member
      ↓
Select Membership
      ↓
Create Membership
      ↓
Auto Issue Card
      ↓
QR / Barcode
      ↓
Member Receives Card
      ↓
     Scan
      ↓
┌─────┼──────────┐
Input Reader   Camera
└─────┼──────────┘
      ↓
 Verification
      ↓
 VALID / INVALID
      ↓
Scan History

36. MVP Principle

Simple workflow, strong business rules, consistent UI.

Prioritas:

Member dapat dibuat.

Membership dapat diterbitkan.

Card otomatis tersedia.

Card dapat diverifikasi.

Verification akurat.

Scan tercatat.

UI konsisten.

Architecture mudah dikembangkan.