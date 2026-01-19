// Configuration
const CONFIG = {
  // n8nのWebhook URLを設定してください
  WEBHOOK_URL: "https://my-n8n.xvps.jp/webhook/freee-accounting",
  // API Keyを設定してください（本番環境では環境変数から取得推奨）
  API_KEY: "sk-freee-accounting-abc123",
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};

// DOM Elements
const uploadForm = document.getElementById("upload-form");
const companyIdInput = document.getElementById("company-id");
const uploadArea = document.getElementById("upload-area");
const fileInput = document.getElementById("file-input");
const previewContainer = document.getElementById("preview-container");
const previewImage = document.getElementById("preview-image");
const removeImageBtn = document.getElementById("remove-image");
const submitBtn = document.getElementById("submit-btn");
const btnText = submitBtn.querySelector(".btn-text");
const btnLoading = submitBtn.querySelector(".btn-loading");
const resultCard = document.getElementById("result-card");
const errorCard = document.getElementById("error-card");

// State
let selectedFile = null;

// Initialize
function init() {
  setupEventListeners();
  loadSavedCompanyId();
}

function setupEventListeners() {
  // Upload area click
  uploadArea.addEventListener("click", () => fileInput.click());

  // File input change
  fileInput.addEventListener("change", handleFileSelect);

  // Drag and drop
  uploadArea.addEventListener("dragover", handleDragOver);
  uploadArea.addEventListener("dragleave", handleDragLeave);
  uploadArea.addEventListener("drop", handleDrop);

  // Remove image
  removeImageBtn.addEventListener("click", removeImage);

  // Form submit
  uploadForm.addEventListener("submit", handleSubmit);

  // Company ID save
  companyIdInput.addEventListener("change", saveCompanyId);

  // New upload button
  document
    .getElementById("new-upload-btn")
    ?.addEventListener("click", resetForm);
  document.getElementById("retry-btn")?.addEventListener("click", resetForm);
}

// File handling
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) validateAndSetFile(file);
}

function handleDragOver(e) {
  e.preventDefault();
  uploadArea.classList.add("dragover");
}

function handleDragLeave(e) {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
}

function handleDrop(e) {
  e.preventDefault();
  uploadArea.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  if (file) validateAndSetFile(file);
}

function validateAndSetFile(file) {
  // Check file type
  if (!file.type.startsWith("image/")) {
    showError("画像ファイルを選択してください");
    return;
  }

  // Check file size
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    showError("ファイルサイズは10MB以下にしてください");
    return;
  }

  selectedFile = file;
  showPreview(file);
  updateSubmitButton();
}

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    uploadArea.classList.add("hidden");
    previewContainer.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  selectedFile = null;
  fileInput.value = "";
  previewImage.src = "";
  previewContainer.classList.add("hidden");
  uploadArea.classList.remove("hidden");
  updateSubmitButton();
}

// Form handling
function updateSubmitButton() {
  const hasFile = selectedFile !== null;
  const hasCompanyId = companyIdInput.value.trim() !== "";
  submitBtn.disabled = !(hasFile && hasCompanyId);
}

async function handleSubmit(e) {
  e.preventDefault();

  if (!selectedFile || !companyIdInput.value.trim()) return;

  setLoading(true);
  hideCards();

  try {
    const base64Image = await fileToBase64(selectedFile);
    const response = await sendToWebhook({
      company_id: parseInt(companyIdInput.value.trim(), 10),
      image: base64Image,
      file_name: selectedFile.name,
    });

    if (response.success) {
      showResult(response);
    } else {
      showError(response.error || "仕訳の作成に失敗しました");
    }
  } catch (error) {
    console.error("Error:", error);
    showError(error.message || "エラーが発生しました");
  } finally {
    setLoading(false);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function sendToWebhook(data) {
  const response = await fetch(CONFIG.WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": CONFIG.API_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  return response.json();
}

// UI Updates
function setLoading(loading) {
  if (loading) {
    submitBtn.disabled = true;
    btnText.classList.add("hidden");
    btnLoading.classList.remove("hidden");
  } else {
    updateSubmitButton();
    btnText.classList.remove("hidden");
    btnLoading.classList.add("hidden");
  }
}

function hideCards() {
  resultCard.classList.add("hidden");
  errorCard.classList.add("hidden");
}

function showResult(data) {
  document.getElementById("result-summary").textContent = data.summary || "-";
  document.getElementById("result-amount").textContent = data.amount
    ? `¥${data.amount.toLocaleString()}`
    : "-";
  document.getElementById("result-deal-id").textContent = data.deal_id || "-";
  document.getElementById("result-receipt-id").textContent =
    data.receipt_id || "-";

  resultCard.classList.remove("hidden");
}

function showError(message) {
  document.getElementById("error-message").textContent = message;
  errorCard.classList.remove("hidden");
}

function resetForm() {
  removeImage();
  hideCards();
  uploadForm.scrollIntoView({ behavior: "smooth" });
}

// Local Storage
function saveCompanyId() {
  localStorage.setItem("freee_company_id", companyIdInput.value);
}

function loadSavedCompanyId() {
  const saved = localStorage.getItem("freee_company_id");
  if (saved) {
    companyIdInput.value = saved;
    updateSubmitButton();
  }
}

// Company ID input listener
companyIdInput.addEventListener("input", updateSubmitButton);

// Initialize app
init();
