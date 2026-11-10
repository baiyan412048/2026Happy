# 2026Happy

快樂航空 Happy Air 桃園（TPE）→ 釜山（PUS）禮物機票頁。

## 修改內容

打開 `index.html`，找到最下方的 `CONFIG`，修改內容：

- `code`：訂位代號（顯示在條碼下方）
- `passenger` / `companion`：旅客與同行旅客姓名
- `message` / `from`：登機證上的文字
- 其他：日期、座位、登機門、艙等、飛行時間、行李、旅客須知

## 網址

https://baiyan412048.github.io/2026Happy/

## 背景版本

| 版本 | 網址 |
| --- | --- |
| 原版（霧藍底） | https://baiyan412048.github.io/2026Happy/ |
| Lofi 寫實雲層 | https://baiyan412048.github.io/2026Happy/?theme=lofi |
| 粉色寫實雲層 | https://baiyan412048.github.io/2026Happy/?theme=pink |
| Lofi 寫實雲層（WebGL，雲會變化） | https://baiyan412048.github.io/2026Happy/?theme=lofi&webgl |
| 粉色寫實雲層（WebGL，雲會變化） | https://baiyan412048.github.io/2026Happy/?theme=pink&webgl |
| 加上 3D 飛機與飛機雲 | 在上面任一個主題網址後加 `&fly`，例如 https://baiyan412048.github.io/2026Happy/?theme=pink&webgl&fly |

- 普通版：使用事先產生好的雲層圖（`assets/clouds/`），一打開就顯示，三層以不同速度飄動。圖檔由 `tools/cloud-generator.html` 產生，要調整雲朵可改那個檔案的參數後重新產生。
- WebGL 版：由 GPU 即時計算，雲的形狀會隨時間慢慢變化；裝置不支援 WebGL 時自動改用普通版。

## 第三方資源

- 3D 飛機模型：A320（無標誌版），來自 [amvlab/aircraft-models](https://github.com/amvlab/aircraft-models)，以 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 授權，未經修改（`assets/models/a320.glb`）。
- 3D 引擎：[three.js](https://threejs.org/) r160，MIT 授權（`vendor/three/`）。
- WebGL 版的雲朵著色器移植自 drift 的〈2D Clouds〉（https://www.shadertoy.com/view/4tdSWr），以 CC BY-NC-SA 3.0 授權；該段著色器沿用相同授權，僅供非商業使用。

## 備份

- 分支 `backup-v1-original`：加入背景版本前的原始版本
- `backup/v1-original.html`：同一份原版的獨立檔案，可直接開啟
- 分支 `backup-v2-canvas-clouds` 與 `backup/v2-canvas-clouds.html`：加入 WebGL 前的 lofi／粉色雲層版本
