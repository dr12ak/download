const client = supabase.createClient("https://yrztxljxuckpokjoqnwu.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyenR4bGp4dWNrcG9ram9xbnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQzODk2MTgsImV4cCI6MjAxOTk2NTYxOH0.heP9JaLV9aTQLxs092UvlqaabjJef0cMe5Io3M_97p0");
window.addEventListener("load", async () => {
  await createTree("");
  if (document.querySelectorAll("#file-tree li").length > 0) {
    const root = createFolder("", "");
    root.id = "root";
    document.querySelector("#file-tree").prepend(root);
    document.querySelector("#file-tree").style.marginTop = "2em";
  }
});

async function createTree(path = "") {
  const files = await fetchFolder(path);
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const latestFolder = findLatestFolder();
  let folderIndex = files.findIndex((x) => isFolder(x));
  if (folderIndex === -1) folderIndex = files.length;
  if (folderIndex !== 0) {
    if (files[0].name === files[folderIndex - 1].name) latestFolder.append(createFile(combinePath(path, files[0].name), files[0].name));
    else latestFolder.append(createFile(combinePath(path, files[0].name), files[0].name + "-" + files[folderIndex - 1].name));
  }
  for (let i = folderIndex; i < files.length; i++) {
    latestFolder.append(createFolder(combinePath(path, files[i]), files[i].name));
    await createTree(combinePath(path, files[i]));
  }
}

function findLatestFolder() {
  if (document.querySelector(".folder")) {
    const folders = document.querySelectorAll("#file-tree .folder > ul");
    return folders[folders.length - 1];
  }
  return document.querySelector("#file-tree");
}

function createFile(path, fileName) {
  const file = document.createElement("li");
  file.classList.add("file");
  file.dataset.path = path;
  file.innerHTML = `
    <span class="name" onclick="previewFile(this.closest('.file'))">
      <svg xmlns="http://www.w3.org/2000/svg" fill="#ffffff" viewBox="0 -960 960 960">
        <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z" />
      </svg>
      ${fileName}
    </span>
    `;
  return file;
}

function createFolder(path, folderName) {
  const folder = document.createElement("li");
  folder.classList.add("folder");
  folder.dataset.path = path;
  folder.innerHTML = `
    <span class="name" onclick="downloadFolder(this.closest('.folder').dataset.path);">
      <svg xmlns="http://www.w3.org/2000/svg" fill="#ffffff" viewBox="0 -960 960 960">
        <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640H447l-80-80H160v480l96-320h684L837-217q-8 26-29.5 41.5T760-160H160Zm84-80h516l72-240H316l-72 240Zm0 0 72-240-72 240Zm-84-400v-80 80Z" />
      </svg>
      ${folderName}
    </span>
    <ul></ul>
    `;
  return folder;
}

function isFolder(file) {
  return file.metadata === null;
}

async function fetchFolder(path = "") {
  return (await client.storage.from("images").list(path, { limit: 10000, sortBy: { column: "updated_at", order: "asc" } })).data;
}

async function downloadFolder(path) {
  if (confirm(path === "" ? "download everything?" : 'download folder at: "' + path + '"?')) {
    const zip = new JSZip();
    document.querySelector("#download-indicator").style.display = "block";
    await zipFiles(zip, path);
    if (Object.keys(zip.files).length > 0) {
      document.querySelector("#download-indicator > span").innerHTML = "generating zip";
      await zip.generateAsync({ type: "blob" }).then((blob) => {
        downloadBlob(blob, path === "" ? "set.zip" : path.match(/([^\/]*)\/*$/)[1] + ".zip");
      });
    }
    document.querySelector("#download-indicator").style.display = "none";
  }
}

function downloadBlob(blob, fileName) {
  const a = document.createElement("a");
  a.href = window.URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000); // revoke object URL after 1min
}

async function zipFiles(zip, path) {
  const files = await fetchFolder(path);
  for await (const file of files) {
    const newPath = combinePath(path, file);
    if (isFolder(file)) await zipFiles(zip, newPath);
    else {
      document.querySelector("#download-indicator > span").innerHTML = newPath;
      const blob = await (await fetch("https://yrztxljxuckpokjoqnwu.supabase.co/storage/v1/object/public/images/" + newPath)).blob();
      if (document.querySelector("#switch-download-type").checked) {
        //zip.file(combinePath(path, path.match(/([^\/]*)\/*$/)[1] + "-" + file.name), blob);
        zip.file(path.match(/([^\/]*)\/*$/)[1] + "-" + file.name, blob);
      } else downloadBlob(blob, file.name);
    }
  }
}

function combinePath(path, file) {
  if (file.name) return path === "" ? file.name : path + "/" + file.name;
  return path === "" ? file : path + "/" + file;
}

function previewFile(file) {
  document.querySelector("#preview").classList.add("show");
  if (file.classList.contains("folder")) document.querySelector("img").src = 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="%23ffffff"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640H447l-80-80H160v480l96-320h684L837-217q-8 26-29.5 41.5T760-160H160Zm84-80h516l72-240H316l-72 240Zm0 0 72-240-72 240Zm-84-400v-80 80Z" /></svg>';
  else document.querySelector("img").src = "https://yrztxljxuckpokjoqnwu.supabase.co/storage/v1/object/public/images/" + file.dataset.path;
}

function closePreview() {
  document.querySelector("#preview").classList.remove("show");
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePreview();
  }
});

async function deleteAllFiles() {
  if (confirm("Delete all files (this cannot be reversed)?")) {
    await client.storage.emptyBucket("images");
    location.reload();
  }
}
