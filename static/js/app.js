/**
 * app.js
 * ==============================================================================
 * Client-side Controller for Image Caption Generator SaaS
 * ==============================================================================
 * Handles single & multi-image upload preview, drag-and-drop staging,
 * parameter synchronization, asynchronous API requests, and per-image
 * paired caption result presentation.
 * ==============================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const captionForm = document.getElementById("captionForm");
  const dropzone = document.getElementById("dropzone");
  const imageInput = document.getElementById("imageInput");
  const dropzonePrompt = document.getElementById("dropzonePrompt");
  const previewContainer = document.getElementById("previewContainer");
  const previewGallery = document.getElementById("previewGallery");
  const stagedCount = document.getElementById("stagedCount");
  const totalStagedSize = document.getElementById("totalStagedSize");
  const addMoreImagesBtn = document.getElementById("addMoreImagesBtn");
  const clearAllImagesBtn = document.getElementById("clearAllImagesBtn");

  // Inline Real-Time Camera Elements
  const browseFilesBtn = document.getElementById("browseFilesBtn");
  const openCameraBtn = document.getElementById("openCameraBtn");
  const addWithCameraBtn = document.getElementById("addWithCameraBtn");
  const cameraContainer = document.getElementById("cameraContainer");
  const cameraVideo = document.getElementById("cameraVideo");
  const cameraCanvas = document.getElementById("cameraCanvas");
  const cameraFlash = document.getElementById("cameraFlash");
  const cameraFlipBtn = document.getElementById("cameraFlipBtn");
  const closeCameraBtn = document.getElementById("closeCameraBtn");
  const shutterBtn = document.getElementById("shutterBtn");
  const cameraError = document.getElementById("cameraError");
  const cameraErrorMessage = document.getElementById("cameraErrorMessage");
  const retryCameraBtn = document.getElementById("retryCameraBtn");
  const cameraSnappedCount = document.getElementById("cameraSnappedCount");

  const platformSelect = document.getElementById("platformSelect");
  const toneSelect = document.getElementById("toneSelect");
  const keywordInput = document.getElementById("keywordInput");
  const hashtagToggle = document.getElementById("hashtagToggle");

  const generateBtn = document.getElementById("generateBtn");
  const btnText = document.getElementById("btnText");
  const btnSpinner = document.getElementById("btnSpinner");

  const resultsSection = document.getElementById("resultsSection");
  const resultsTitle = document.getElementById("resultsTitle");
  const resultsList = document.getElementById("resultsList");
  const resultImagesBadge = document.getElementById("resultImagesBadge");
  const resultPlatformBadge = document.getElementById("resultPlatformBadge");
  const resultToneBadge = document.getElementById("resultToneBadge");
  const copyAllCaptionsBtn = document.getElementById("copyAllCaptionsBtn");
  const inferenceSpeed = document.getElementById("inferenceSpeed");

  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");

  // Multi-image selection state
  let selectedFiles = [];
  let toastTimeout = null;
  let currentResults = [];

  // Inline Camera State
  let activeCameraStream = null;
  let currentFacingMode = "user"; // "user" or "environment"
  let sessionSnapCount = 0;

  // ============================================================================
  // Toast Notification System
  // ============================================================================
  function showToast(message, isError = false) {
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toastMsg.textContent = message;
    if (isError) {
      toast.classList.remove("border-slate-700");
      toast.classList.add("border-rose-500/50", "bg-rose-950/90");
    } else {
      toast.classList.remove("border-rose-500/50", "bg-rose-950/90");
      toast.classList.add("border-slate-700", "bg-slate-900");
    }

    toast.classList.remove("toast-enter");
    toast.classList.add("toast-show");

    toastTimeout = setTimeout(() => {
      toast.classList.remove("toast-show");
      toast.classList.add("toast-enter");
    }, 3200);
  }

  // ============================================================================
  // File Sizing & Multi-Image Gallery Rendering
  // ============================================================================
  function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function renderGallery() {
    if (selectedFiles.length === 0) {
      if (cameraContainer.classList.contains("hidden")) {
        previewContainer.classList.add("hidden");
        previewContainer.classList.remove("flex");
        dropzonePrompt.classList.remove("hidden");
      }
      previewGallery.innerHTML = "";
      imageInput.value = "";
      return;
    }

    // Only switch to previewContainer if camera is NOT actively open
    if (cameraContainer.classList.contains("hidden")) {
      dropzonePrompt.classList.add("hidden");
      previewContainer.classList.remove("hidden");
      previewContainer.classList.add("flex");
    }

    const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    const countLabel = selectedFiles.length === 1 ? "1 Image Staged" : `${selectedFiles.length} Images Staged`;
    stagedCount.textContent = countLabel;
    totalStagedSize.textContent = formatBytes(totalBytes);

    previewGallery.innerHTML = "";

    selectedFiles.forEach((file, index) => {
      const card = document.createElement("div");
      card.className = "relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-800 p-1.5 flex flex-col items-center gap-1.5 shadow-md";

      const imgWrapper = document.createElement("div");
      imgWrapper.className = "w-full h-24 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center relative";

      const img = document.createElement("img");
      img.className = "w-full h-full object-cover";
      img.alt = file.name;

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      imgWrapper.appendChild(img);

      // Remove single image button
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-slate-950/80 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow";
      removeBtn.innerHTML = '<i data-lucide="x" class="w-3.5 h-3.5"></i>';
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFile(index);
      });
      imgWrapper.appendChild(removeBtn);

      const meta = document.createElement("div");
      meta.className = "w-full text-left px-1";
      meta.innerHTML = `
        <p class="text-xs font-semibold text-slate-200 truncate" title="${file.name}">${file.name}</p>
        <p class="text-[10px] text-slate-400 font-mono">${formatBytes(file.size)}</p>
      `;

      card.appendChild(imgWrapper);
      card.appendChild(meta);
      previewGallery.appendChild(card);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function handleFilesAdded(fileList) {
    if (!fileList || fileList.length === 0) return;

    let addedCount = 0;
    Array.from(fileList).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        showToast(`Skipped ${file.name}: Not an image.`, true);
        return;
      }
      if (file.size > 16 * 1024 * 1024) {
        showToast(`Skipped ${file.name}: Exceeds 16MB limit.`, true);
        return;
      }
      // Avoid duplicate filenames
      if (!selectedFiles.some((f) => f.name === file.name && f.size === file.size)) {
        selectedFiles.push(file);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      renderGallery();
      showToast(`${addedCount} image${addedCount > 1 ? "s" : ""} added.`);
    }
  }

  function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderGallery();
  }

  function clearAllImages() {
    selectedFiles = [];
    sessionSnapCount = 0;
    if (cameraSnappedCount) cameraSnappedCount.textContent = "0 snaps";
    renderGallery();
    showToast("Cleared all images.");
  }

  // ============================================================================
  // Inline Real-Time Camera System (ChatGPT Style)
  // ============================================================================
  async function openInlineCamera() {
    // Hide default dropzone prompt and staging preview while camera is open
    dropzonePrompt.classList.add("hidden");
    previewContainer.classList.add("hidden");
    previewContainer.classList.remove("flex");

    // Reveal inline camera viewfinder container
    cameraContainer.classList.remove("hidden");
    cameraContainer.classList.add("flex");
    cameraError.classList.add("hidden");

    if (window.lucide) {
      lucide.createIcons();
    }

    await startCameraStream();
  }

  async function startCameraStream() {
    stopCameraStream();

    const constraints = {
      video: {
        facingMode: currentFacingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      activeCameraStream = stream;
      cameraVideo.srcObject = stream;
      await cameraVideo.play();
      cameraError.classList.add("hidden");
    } catch (err) {
      console.warn("[CapAI Camera]", err);
      cameraError.classList.remove("hidden");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        cameraErrorMessage.textContent = "Camera permission was denied. Please allow camera access in your browser settings or URL bar.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        cameraErrorMessage.textContent = "No camera hardware detected on this device.";
      } else {
        cameraErrorMessage.textContent = `Camera error: ${err.message || "Unable to access live webcam feed."}`;
      }
    }
  }

  function stopCameraStream() {
    if (activeCameraStream) {
      activeCameraStream.getTracks().forEach((track) => track.stop());
      activeCameraStream = null;
    }
    if (cameraVideo) {
      cameraVideo.srcObject = null;
    }
  }

  function closeInlineCamera() {
    stopCameraStream();
    cameraContainer.classList.add("hidden");
    cameraContainer.classList.remove("flex");

    if (selectedFiles.length > 0) {
      previewContainer.classList.remove("hidden");
      previewContainer.classList.add("flex");
    } else {
      dropzonePrompt.classList.remove("hidden");
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  async function flipCamera() {
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
    await startCameraStream();
  }

  function capturePhotoFromCamera() {
    if (!activeCameraStream || !cameraVideo.videoWidth) {
      showToast("Camera feed is not ready yet.", true);
      return;
    }

    // 1. Shutter flash visual feedback
    cameraFlash.classList.add("flash-active");
    setTimeout(() => {
      cameraFlash.classList.remove("flash-active");
    }, 120);

    // 2. Render frame to offscreen canvas
    const width = cameraVideo.videoWidth;
    const height = cameraVideo.videoHeight;
    cameraCanvas.width = width;
    cameraCanvas.height = height;

    const ctx = cameraCanvas.getContext("2d");
    ctx.drawImage(cameraVideo, 0, 0, width, height);

    // 3. Export to JPEG Blob & File
    cameraCanvas.toBlob((blob) => {
      if (!blob) {
        showToast("Snapshot failed to encode.", true);
        return;
      }

      sessionSnapCount++;
      cameraSnappedCount.textContent = `${sessionSnapCount} snap${sessionSnapCount > 1 ? "s" : ""}`;

      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const filename = `snap_${timestamp}_${sessionSnapCount}.jpg`;

      const file = new File([blob], filename, { type: "image/jpeg" });
      selectedFiles.push(file);

      // Silently update gallery badge & staging without closing camera
      renderGallery();

      showToast(`Photo #${selectedFiles.length} captured and staged!`);
    }, "image/jpeg", 0.94);
  }

  // ============================================================================
  // Event Listeners for Dropzone and Controls
  // ============================================================================
  dropzone.addEventListener("click", (e) => {
    // Avoid triggering file picker when clicking buttons or inside active camera
    if (e.target.closest("button") || e.target.closest("#cameraContainer")) return;
    imageInput.click();
  });

  browseFilesBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    imageInput.click();
  });

  openCameraBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    openInlineCamera();
  });

  addWithCameraBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    openInlineCamera();
  });

  closeCameraBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeInlineCamera();
  });

  cameraFlipBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    flipCamera();
  });

  retryCameraBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    startCameraStream();
  });

  shutterBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    capturePhotoFromCamera();
  });

  // Stop camera when closing/navigating away from page
  window.addEventListener("beforeunload", stopCameraStream);

  addMoreImagesBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    imageInput.click();
  });

  clearAllImagesBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearAllImages();
  });

  imageInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
    }
  });

  // Drag and Drop styling
  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleFilesAdded(dt.files);
    }
  });

  // ============================================================================
  // Form Submission & Multi-Image API Request
  // ============================================================================
  captionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      showToast("Please upload one or more images first.", true);
      dropzone.classList.add("dragover");
      setTimeout(() => dropzone.classList.remove("dragover"), 500);
      return;
    }

    // Set UI loading state
    generateBtn.disabled = true;
    btnSpinner.classList.remove("hidden");
    const countText = selectedFiles.length === 1 ? "image" : `${selectedFiles.length} images`;
    btnText.textContent = `Generating captions for ${countText}...`;

    const formData = new FormData();
    // Append all selected images to formData
    selectedFiles.forEach((file) => {
      formData.append("images", file);
      formData.append("image", file); // Compatibility
    });

    formData.append("platform", platformSelect.value);
    formData.append("tone", toneSelect.value);
    formData.append("keyword", keywordInput.value);
    formData.append("generate_hashtags", hashtagToggle.checked ? "true" : "false");
    formData.append("include_hashtags", hashtagToggle.checked ? "true" : "false");

    try {
      const response = await fetch("/api/generate_caption", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate caption.");
      }

      currentResults = data.results || [{
        image_index: 1,
        filename: selectedFiles[0]?.name || "image.jpg",
        caption: data.caption,
        similarity_score: 0.25,
        stats: data.stats || { character_count: data.caption.length, word_count: data.caption.split(" ").length }
      }];

      // Render Paired Image-Caption Cards
      renderResultsList(currentResults, data);

      // Show results smoothly
      resultsSection.classList.remove("hidden");
      if (window.lucide) {
        lucide.createIcons();
      }

      // Smooth scroll to results
      resultsSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const successMsg = currentResults.length > 1
        ? `Generated ${currentResults.length} tailored captions!`
        : "Recommended caption generated!";
      showToast(successMsg);

    } catch (err) {
      console.error("[CapAI]", err);
      showToast(err.message || "An unexpected error occurred. Please try again.", true);
    } finally {
      // Restore button state
      generateBtn.disabled = false;
      btnSpinner.classList.add("hidden");
      btnText.textContent = "Generate Best Caption";
    }
  });

  // ============================================================================
  // Paired Results Rendering (Image + Caption)
  // ============================================================================
  function renderResultsList(results, data) {
    resultsList.innerHTML = "";

    const count = results.length;
    resultsTitle.textContent = count > 1 ? "Recommended Captions" : "Recommended Caption";
    resultImagesBadge.innerHTML = `<i data-lucide="layers" class="w-3 h-3 text-indigo-400"></i> ${count} Image${count > 1 ? "s" : ""}`;
    resultPlatformBadge.innerHTML = `<i data-lucide="share-2" class="w-3 h-3 text-violet-400"></i> ${data.platform}`;
    resultToneBadge.innerHTML = `<i data-lucide="smile" class="w-3 h-3 text-purple-400"></i> ${data.tone}`;
    inferenceSpeed.textContent = `${data.inference_time_ms || 45}ms`;

    // Toggle "Copy All" button visibility
    if (count > 1) {
      copyAllCaptionsBtn.classList.remove("hidden");
    } else {
      copyAllCaptionsBtn.classList.add("hidden");
    }

    results.forEach((item, idx) => {
      const card = document.createElement("div");
      card.className = "p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex flex-col md:flex-row items-start md:items-center gap-4 group hover:border-violet-500/40 transition-all shadow-lg";

      // 1. Thumbnail Container (Linked directly to uploaded file)
      const thumbContainer = document.createElement("div");
      thumbContainer.className = "flex items-center gap-3 w-full md:w-auto flex-shrink-0";

      const thumbBox = document.createElement("div");
      thumbBox.className = "w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 flex-shrink-0 relative shadow";

      const thumbImg = document.createElement("img");
      thumbImg.className = "w-full h-full object-cover";
      thumbImg.alt = item.filename;

      // Associate with local File object for crisp instant preview
      const localFile = selectedFiles[idx] || selectedFiles.find(f => f.name === item.filename);
      if (localFile) {
        thumbImg.src = URL.createObjectURL(localFile);
      } else {
        thumbImg.src = "/static/sample_sunset.jpg";
      }
      thumbBox.appendChild(thumbImg);

      const idxPill = document.createElement("span");
      idxPill.className = "absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-violet-300 font-bold border border-violet-500/20";
      idxPill.textContent = `#${item.image_index}`;
      thumbBox.appendChild(idxPill);
      thumbContainer.appendChild(thumbBox);

      // Mobile filename label
      const mobileLabel = document.createElement("div");
      mobileLabel.className = "md:hidden flex-grow truncate";
      mobileLabel.innerHTML = `
        <p class="text-xs font-semibold text-slate-200 truncate">${item.filename}</p>
        <span class="text-[10px] text-violet-400 font-mono">Matched for Image ${item.image_index}</span>
      `;
      thumbContainer.appendChild(mobileLabel);

      // 2. Caption & Details Container
      const bodyContainer = document.createElement("div");
      bodyContainer.className = "flex-grow space-y-2.5 w-full";

      // Header row inside card (desktop)
      const cardHeader = document.createElement("div");
      cardHeader.className = "hidden md:flex items-center justify-between";
      cardHeader.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 font-medium">
            Image ${item.image_index}: ${item.filename}
          </span>
          <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            Aligned
          </span>
        </div>
        <div class="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span>${item.stats.character_count} chars</span>
          <span>•</span>
          <span>${item.stats.word_count} words</span>
        </div>
      `;
      bodyContainer.appendChild(cardHeader);

      // The distinct caption paragraph
      const captionP = document.createElement("p");
      captionP.className = "text-slate-100 text-base sm:text-lg font-medium leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/90 select-all";
      captionP.textContent = item.caption;
      bodyContainer.appendChild(captionP);

      // Actions row
      const cardActions = document.createElement("div");
      cardActions.className = "flex items-center justify-between pt-1";
      cardActions.innerHTML = `
        <div class="flex md:hidden items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span>${item.stats.character_count} chars</span>
          <span>•</span>
          <span>${item.stats.word_count} words</span>
        </div>
      `;

      // Copy Single Caption Button
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "ml-auto px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-medium text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow";
      copyBtn.innerHTML = '<i data-lucide="copy" class="w-3.5 h-3.5 text-violet-400"></i><span>Copy Caption</span>';
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(item.caption);
          copyBtn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i><span>Copied!</span>';
          if (window.lucide) lucide.createIcons();
          showToast(`Copied caption for Image #${item.image_index}!`);
          setTimeout(() => {
            copyBtn.innerHTML = '<i data-lucide="copy" class="w-3.5 h-3.5 text-violet-400"></i><span>Copy Caption</span>';
            if (window.lucide) lucide.createIcons();
          }, 2000);
        } catch (e) {
          showToast("Failed to copy to clipboard.", true);
        }
      });

      cardActions.appendChild(copyBtn);
      bodyContainer.appendChild(cardActions);

      card.appendChild(thumbContainer);
      card.appendChild(bodyContainer);
      resultsList.appendChild(card);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // ============================================================================
  // Copy All Captions Action
  // ============================================================================
  copyAllCaptionsBtn.addEventListener("click", async () => {
    if (!currentResults || currentResults.length === 0) return;

    const fullText = currentResults
      .map(r => `[Image ${r.image_index}: ${r.filename}]\n${r.caption}`)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(fullText);
      showToast(`All ${currentResults.length} captions copied to clipboard!`);
    } catch (err) {
      showToast("Could not copy all captions.", true);
    }
  });
});
