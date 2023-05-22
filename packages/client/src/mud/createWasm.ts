type WASM = {
  api: any;
};

async function loadGoRuntime() {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "public/wasm/wasm_exec.js";
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}

export async function createWasm(): Promise<WASM> {
  await loadGoRuntime();

  const go = new (window as any).Go();

  const response = await fetch("public/wasm/main.wasm");
  const binary = await response.arrayBuffer();

  const result = await WebAssembly.instantiate(binary, go.importObject);
  go.run(result.instance);
  const api = (window as any).NesAPI();

  return { api };
}
