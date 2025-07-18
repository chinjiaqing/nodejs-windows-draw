// src/index.ts
import koffi from "koffi";
var RECT = koffi.struct("RECT", {
  left: "long",
  // 偏移0字节（4字节）
  top: "long",
  // 偏移4字节（4字节）
  right: "long",
  // 偏移8字节（4字节）
  bottom: "long"
  // 偏移12字节（4字节）
});
koffi.alias("HWND", "void*");
koffi.alias("HDC", "void*");
koffi.alias("HBRUSH", "void*");
koffi.alias("LPRECT", "void*");
var user32 = koffi.load("user32.dll");
var gdi32 = koffi.load("gdi32.dll");
var GetDC = user32.func("HDC __stdcall GetDC(HWND hWnd)");
var ReleaseDC = user32.func("int __stdcall ReleaseDC(HWND hWnd, HDC hDC)");
var GetSystemMetrics = user32.func("int __stdcall GetSystemMetrics(int nIndex)");
var CreateSolidBrush = gdi32.func("HBRUSH __stdcall CreateSolidBrush(uint32 color)");
var FillRect = user32.func("int __stdcall FillRect(HDC hdc, LPRECT lprc, HBRUSH hbr)");
var DeleteObject = gdi32.func("int __stdcall DeleteObject(void* hObject)");
function drawFullScreenRect() {
  const hdc = GetDC(null);
  if (!hdc) {
    console.error("GetDC(NULL) \u5931\u8D25\uFF08\u9700\u7BA1\u7406\u5458\u6743\u9650\u8FD0\u884C\uFF09");
    return;
  }
  const width = GetSystemMetrics(0);
  const height = GetSystemMetrics(1);
  console.log(`\u5C4F\u5E55\u5C3A\u5BF8\uFF1A${width}x${height}`);
  const fullScreenRect = {
    left: 0,
    top: 0,
    right: width,
    bottom: height
  };
  const rectBuffer = koffi.alloc(RECT, 1);
  koffi.write(rectBuffer, RECT, fullScreenRect);
  const brush = CreateSolidBrush(65280);
  if (!brush) {
    console.error("CreateSolidBrush \u5931\u8D25");
    ReleaseDC(null, hdc);
    koffi.free(rectBuffer);
    return;
  }
  const ret = FillRect(hdc, rectBuffer, brush);
  if (ret === 0) {
    console.error("FillRect \u5931\u8D25\uFF08\u9519\u8BEF\u7801\uFF1A", koffi.errno(), "\uFF09");
  } else {
    console.log("FillRect \u6210\u529F\uFF08\u5C4F\u5E55\u5DF2\u586B\u5145\u4E3A\u7EFF\u8272\uFF09");
  }
  DeleteObject(brush);
  ReleaseDC(null, hdc);
  koffi.free(rectBuffer);
}
drawFullScreenRect();
//# sourceMappingURL=index.js.map