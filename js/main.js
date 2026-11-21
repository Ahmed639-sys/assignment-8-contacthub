const STORAGE_KEY = "contacthub_contacts";

// ---------- State ----------
let contacts = loadContacts();
let editingId = null;
let photoData = "";

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const modal = $("modal");
const fields = {
  name: $("name"), phone: $("phone"), email: $("email"), address: $("address"),
  group: $("group"), notes: $("notes"), isFav: $("isFav"), isEmg: $("isEmg"),
};

// ---------- Storage ----------
function loadContacts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}
function saveContacts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

// ---------- Helpers ----------
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const initials = (name) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const avatarHTML = (c, badges = false) => `
  <div class="avatar">
    ${c.photo ? `<img src="${c.photo}" alt="${esc(c.name)}" />` : initials(c.name)}
    ${badges && c.favorite ? '<span class="badge fav"><i class="fa-solid fa-star"></i></span>' : ""}
    ${badges && c.emergency ? '<span class="badge emg"><i class="fa-solid fa-heart-pulse"></i></span>' : ""}
  </div>`;

const toast = (title) =>
  Swal.fire({ icon: "success", title, timer: 1500, showConfirmButton: false });

const showError = (title, text) =>
  Swal.fire({ icon: "error", title, text, confirmButtonColor: "#6c5ce7" });

// ---------- Render ----------
function render() {
  const q = $("searchInput").value.trim().toLowerCase();
  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email || "").toLowerCase().includes(q)
  );

  // Stats
  const favs = contacts.filter((c) => c.favorite);
  const emgs = contacts.filter((c) => c.emergency);
  $("totalCount").textContent = contacts.length;
  $("favCount").textContent = favs.length;
  $("emgCount").textContent = emgs.length;
  $("subtitle").textContent = `Manage and organize your ${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"}`;

  // Main grid
  $("contactsGrid").innerHTML = filtered.map(cardHTML).join("");
  $("emptyState").classList.toggle("show", filtered.length === 0);

  // Sidebar
  $("favList").innerHTML = favs.length
    ? favs.map((c) => miniHTML(c, "call")).join("")
    : '<div class="side-empty">No favorites yet</div>';
  $("emgList").innerHTML = emgs.length
    ? emgs.map((c) => miniHTML(c, "call-red")).join("")
    : '<div class="side-empty">No emergency contacts</div>';
}

function cardHTML(c) {
  return `
  <article class="card">
    <div class="card-top">
      <div class="card-id">
        ${avatarHTML(c, true)}
        <div>
          <div class="card-name">${esc(c.name)}</div>
          <div class="phone-line"><span class="mini-ic b"><i class="fa-solid fa-phone"></i></span>${esc(c.phone)}</div>
        </div>
      </div>
      ${c.email ? `<div class="info-row"><span class="mini-ic p"><i class="fa-solid fa-envelope"></i></span>${esc(c.email)}</div>` : ""}
      ${c.address ? `<div class="info-row"><span class="mini-ic g"><i class="fa-solid fa-location-dot"></i></span>${esc(c.address)}</div>` : ""}
      ${c.notes ? `<div class="info-row"><span class="mini-ic b"><i class="fa-solid fa-note-sticky"></i></span>${esc(c.notes)}</div>` : ""}
      ${c.group || c.emergency ? `<div class="tags">
        ${c.group ? `<span class="tag">${esc(c.group)}</span>` : ""}
        ${c.emergency ? '<span class="tag emg"><i class="fa-solid fa-heart-pulse"></i> Emergency</span>' : ""}
      </div>` : ""}
    </div>
    <div class="card-actions">
      <div class="grp">
        <a class="act call" href="tel:${esc(c.phone)}" title="Call"><i class="fa-solid fa-phone"></i></a>
        ${c.email ? `<a class="act mail" href="mailto:${esc(c.email)}" title="Email"><i class="fa-solid fa-envelope"></i></a>` : ""}
      </div>
      <div class="grp">
        <button class="act fav ${c.favorite ? "on" : ""}" onclick="toggleFav('${c.id}')" title="Favorite">
          <i class="${c.favorite ? "fa-solid" : "fa-regular"} fa-star"></i>
        </button>
        <button class="act emg ${c.emergency ? "on" : ""}" onclick="toggleEmg('${c.id}')" title="Emergency">
          <i class="${c.emergency ? "fa-solid" : "fa-regular"} fa-heart"></i>
        </button>
        <button class="act" onclick="openEdit('${c.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="act" onclick="deleteContact('${c.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  </article>`;
}

function miniHTML(c, cls) {
  return `
  <div class="mini-contact">
    ${avatarHTML(c)}
    <div class="info"><b>${esc(c.name)}</b><small>${esc(c.phone)}</small></div>
    <a class="act ${cls}" href="tel:${esc(c.phone)}" title="Call"><i class="fa-solid fa-phone"></i></a>
  </div>`;
}

// ---------- Modal ----------
function setPhoto(src) {
  photoData = src || "";
  $("photoPreview").innerHTML = photoData
    ? `<img src="${photoData}" alt="Contact photo" />`
    : '<i class="fa-solid fa-user"></i>';
}

function openModal() {
  modal.classList.add("show");
  $("modalTitle").textContent = editingId ? "Edit Contact" : "Add New Contact";
  $("modal").querySelector(".modal-body").scrollTop = 0;
}

function closeModal() {
  modal.classList.remove("show");
  editingId = null;
  Object.values(fields).forEach((f) => {
    f.type === "checkbox" ? (f.checked = false) : (f.value = "");
    f.classList.remove("invalid");
  });
  $("photoInput").value = "";
  setPhoto("");
}

function openAdd() {
  editingId = null;
  openModal();
}

function openEdit(id) {
  const c = contacts.find((x) => x.id === id);
  if (!c) return;
  editingId = id;
  fields.name.value = c.name;
  fields.phone.value = c.phone;
  fields.email.value = c.email || "";
  fields.address.value = c.address || "";
  fields.group.value = c.group || "";
  fields.notes.value = c.notes || "";
  fields.isFav.checked = c.favorite;
  fields.isEmg.checked = c.emergency;
  setPhoto(c.photo);
  openModal();
}

// ---------- Validation ----------
const PHONE_RE = /^01[0125][0-9]{8}$/;           // Egyptian mobile numbers
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate() {
  const name = fields.name.value.trim();
  const phone = fields.phone.value.trim();
  const email = fields.email.value.trim();
  Object.values(fields).forEach((f) => f.classList.remove("invalid"));

  if (!name) return fail("Missing Name", "Please enter the contact's name!", fields.name);
  if (name.length < 2) return fail("Invalid Name", "Name must be at least 2 characters.", fields.name);
  if (!phone) return fail("Missing Phone", "Please enter a phone number!", fields.phone);
  if (!PHONE_RE.test(phone))
    return fail("Invalid Phone", "Enter a valid Egyptian number, e.g. 01012345678.", fields.phone);
  if (email && !EMAIL_RE.test(email))
    return fail("Invalid Email", "Please enter a valid email like name@example.com.", fields.email);

  const duplicate = contacts.some((c) => c.phone === phone && c.id !== editingId);
  if (duplicate) return fail("Duplicate Phone", "A contact with this phone number already exists.", fields.phone);

  return true;
}

function fail(title, text, field) {
  field.classList.add("invalid");
  showError(title, text).then(() => field.focus());
  return false;
}

// ---------- Actions ----------
function saveContact() {
  if (!validate()) return;

  const data = {
    name: fields.name.value.trim(),
    phone: fields.phone.value.trim(),
    email: fields.email.value.trim(),
    address: fields.address.value.trim(),
    group: fields.group.value,
    notes: fields.notes.value.trim(),
    favorite: fields.isFav.checked,
    emergency: fields.isEmg.checked,
    photo: photoData,
  };

  if (editingId) {
    contacts = contacts.map((c) => (c.id === editingId ? { ...c, ...data } : c));
    toast("Contact updated successfully!");
  } else {
    contacts.unshift({ id: Date.now().toString(), ...data });
    toast("Contact added successfully!");
  }

  saveContacts();
  closeModal();
  render();
}

function deleteContact(id) {
  const c = contacts.find((x) => x.id === id);
  if (!c) return;
  Swal.fire({
    icon: "warning",
    title: "Delete Contact?",
    text: `Are you sure you want to delete ${c.name}? This action cannot be undone.`,
    showCancelButton: true,
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#6b7280",
  }).then((res) => {
    if (!res.isConfirmed) return;
    contacts = contacts.filter((x) => x.id !== id);
    saveContacts();
    render();
    toast("Contact deleted!");
  });
}

function toggleFav(id) {
  contacts = contacts.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c));
  saveContacts();
  render();
}

function toggleEmg(id) {
  contacts = contacts.map((c) => (c.id === id ? { ...c, emergency: !c.emergency } : c));
  saveContacts();
  render();
}

// ---------- Events ----------
$("openAdd").addEventListener("click", openAdd);
$("closeModal").addEventListener("click", closeModal);
$("cancelBtn").addEventListener("click", closeModal);
$("saveBtn").addEventListener("click", saveContact);
$("searchInput").addEventListener("input", render);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("show")) closeModal(); });

// Photo upload (resized to keep localStorage small)
$("photoInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 160;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      setPhoto(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// Init
render();
