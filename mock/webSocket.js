const WebSocket = require("ws");

// 创建 WebSocket 服务器，监听 9000 端口
const wss = new WebSocket.Server({ port: 9000 });
let interval = null;
// 当有新的客户端连接到服务器时触发
wss.on("connection", (ws) => {
  console.log("Client connected");
  interval && clearInterval(interval);
  interval = setInterval(() => {
    ws.send(
      JSON.stringify({
        cpu_count: 24,
        cpu_usage: 1.9,
        mem_used: "101.37",
        mem_total: "503.38",
        mem_percent: 22.2,
        disk_used: "732.11",
        disk_total: "860.33",
        disk_percent: 85.1,
        gpu_count: 8,
        gpu_list: [
          {
            name: "GPU 0: NVIDIA GeForce RTX 3090",
            gpu_usage: "0.23",
            gpu_total: "24.00",
          },
          {
            name: "GPU 1: NVIDIA GeForce RTX 3090",
            gpu_usage: "0.14",
            gpu_total: "24.00",
          },
          {
            name: "GPU 2: NVIDIA GeForce RTX 3090",
            gpu_usage: "0.03",
            gpu_total: "24.00",
          },
          {
            name: "GPU 3: NVIDIA GeForce RTX 3090",
            gpu_usage: "0.05",
            gpu_total: "24.00",
          },
          {
            name: "GPU 4: NVIDIA GeForce RTX 3090",
            gpu_usage: "0.10",
            gpu_total: "24.00",
          },
          {
            name: "GPU 5: NVIDIA GeForce RTX 3090",
            gpu_usage: "0.16",
            gpu_total: "24.00",
          },
          {
            name: "GPU 6: NVIDIA GeForce RTX 3090",
            gpu_usage: "0.69",
            gpu_total: "24.00",
          },
          {
            name: "GPU 7: NVIDIA GeForce RTX 3090",
            gpu_usage: "0.37",
            gpu_total: "24.00",
          },
        ],
      })
    );
  }, 3000);
  // 当客户端断开连接时触发
  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

console.log("WebSocket server is running on port 9000");
