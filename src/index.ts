import koffi from 'koffi';

// 1. 定义RECT结构体（与Windows API一致）
const RECT = koffi.struct('RECT', {
  left: 'long',  // 偏移0字节（4字节）
  top: 'long',   // 偏移4字节（4字节）
  right: 'long', // 偏移8字节（4字节）
  bottom: 'long' // 偏移12字节（4字节）
});

// 2. 定义类型别名（简化API调用）
koffi.alias('HWND', 'void*');
koffi.alias('HDC', 'void*');
koffi.alias('HBRUSH', 'void*');
koffi.alias('LPRECT', 'void*'); // LPRECT = 指向RECT的指针

// 3. 加载Windows API库
const user32 = koffi.load('user32.dll');
const gdi32 = koffi.load('gdi32.dll');

// 4. 定义API函数（严格遵循Windows API签名）
const GetDC = user32.func('HDC __stdcall GetDC(HWND hWnd)');
const ReleaseDC = user32.func('int __stdcall ReleaseDC(HWND hWnd, HDC hDC)');
const GetSystemMetrics = user32.func('int __stdcall GetSystemMetrics(int nIndex)');
const CreateSolidBrush = gdi32.func('HBRUSH __stdcall CreateSolidBrush(uint32 color)');
const FillRect = user32.func('int __stdcall FillRect(HDC hDC, LPRECT lprc, HBRUSH hbr)');
const DeleteObject = gdi32.func('int __stdcall DeleteObject(void* hObject)');

// 5. 主绘制函数（实现全屏填充绿色）
function drawFullScreenRect() {
  // 获取桌面DC（null=桌面窗口，需管理员权限）
  const hdc = GetDC(null);
  if (!hdc) {
    console.error('GetDC(NULL) 失败（需管理员权限运行）');
    return;
  }

  // 获取屏幕尺寸（SM_CXSCREEN=0：宽度；SM_CYSCREEN=1：高度）
  const width = GetSystemMetrics(0);
  const height = GetSystemMetrics(1);
  console.log(`屏幕尺寸：${width}x${height}`);

  // -------------------------- 核心修复：正确获取底层Buffer --------------------------
  // a. 分配1个RECT结构体的内存（返回koffi.Buffer，大小16字节）
  const rectBuffer = koffi.alloc(RECT, 1);
  // b. 获取底层Node.js Buffer（koffi@2.12.2中使用`buffer`属性）
  const nodeBuffer = rectBuffer.buffer; // 关键：替换`data`为`buffer`
  if (!nodeBuffer) {
    console.error('无法获取底层Node.js Buffer（koffi版本不兼容）');
    ReleaseDC(null, hdc);
    return;
  }
  // c. 手动设置RECT的成员（通过Node.js Buffer的writeInt32LE方法）
  nodeBuffer.writeInt32LE(0, 0);     // left = 0（偏移0字节，小端序）
  nodeBuffer.writeInt32LE(0, 4);     // top = 0（偏移4字节）
  nodeBuffer.writeInt32LE(width, 8);  // right = 屏幕宽度（偏移8字节）
  nodeBuffer.writeInt32LE(height, 12); // bottom = 屏幕高度（偏移12字节）
  // -----------------------------------------------------------------------------------

  // 创建绿色画刷（Windows颜色格式为BGR，0x0000FF00=绿色）
  const brush = CreateSolidBrush(0x0000FF00);
  if (!brush) {
    console.error('CreateSolidBrush 失败');
    ReleaseDC(null, hdc);
    return;
  }

  // 填充整个屏幕为绿色（LPRECT参数传递rectBuffer的指针）
  const ret = FillRect(hdc, rectBuffer, brush);
  if (ret === 0) {
    console.error('FillRect 失败（错误码：', koffi.errno(), '）');
  } else {
    console.log('FillRect 成功（屏幕已填充为绿色）');
  }

  // 释放资源（避免内存泄漏）
  DeleteObject(brush); // 释放画刷
  ReleaseDC(null, hdc); // 释放DC
  koffi.free(rectBuffer); // 释放RECT缓冲区（koffi.alloc分配的内存需手动释放）
}

// 运行绘制函数
drawFullScreenRect();