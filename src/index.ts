import koffi from "koffi";

// 1. 定义RECT结构体（与Windows API一致）
const RECT = koffi.struct("RECT", {
	left: "long",  // 偏移0字节（4字节）
	top: "long",   // 偏移4字节（4字节）
	right: "long", // 偏移8字节（4字节）
	bottom: "long" // 偏移12字节（4字节）
});

// 2. 定义类型别名（简化API调用）
koffi.alias("HWND", "void*");
koffi.alias("HDC", "void*");
koffi.alias("HBRUSH", "void*");
koffi.alias("LPRECT", "void*"); // LPRECT = 指向RECT的指针

// 3. 加载Windows API库
const user32 = koffi.load("user32.dll");
const gdi32 = koffi.load("gdi32.dll");

// 4. 定义API函数（严格遵循Windows API签名）
const GetDC = user32.func("HDC __stdcall GetDC(HWND hWnd)");
const ReleaseDC = user32.func("int __stdcall ReleaseDC(HWND hWnd, HDC hDC)");
const GetSystemMetrics = user32.func("int __stdcall GetSystemMetrics(int nIndex)");
const CreateSolidBrush = gdi32.func("HBRUSH __stdcall CreateSolidBrush(uint32 color)");
const FillRect = user32.func("int __stdcall FillRect(HDC hdc, LPRECT lprc, HBRUSH hbr)");
const DeleteObject = gdi32.func("int __stdcall DeleteObject(void* hObject)");

// 5. 主绘制函数（实现全屏填充绿色）
function drawFullScreenRect() {
	// 获取桌面DC（null=桌面窗口，需管理员权限）
	const hdc = GetDC(null);
	if (!hdc) {
		console.error("GetDC(NULL) 失败（需管理员权限运行）");
		return;
	}

	// 获取屏幕尺寸（SM_CXSCREEN=0：宽度；SM_CYSCREEN=1：高度）
	const width = GetSystemMetrics(0);
	const height = GetSystemMetrics(1);
	console.log(`屏幕尺寸：${width}x${height}`);

	// -------------------------- 核心修复：传递RECT指针 --------------------------
	// a. 定义填充区域（全屏）
	const fullScreenRect = {
		left: 0,
		top: 0,
		right: width,
		bottom: height
	};
	// b. 分配1个RECT结构体的内存（返回koffi.Buffer，代表LPRECT指针）
	const rectBuffer = koffi.alloc(RECT, 1);
	// c. 将fullScreenRect写入RECT缓冲区（确保内存布局符合Windows API要求）
	koffi.write(rectBuffer, RECT, fullScreenRect); // 关键：将对象转换为结构体指针
	// -----------------------------------------------------------------------------------

	// 创建绿色画刷（Windows颜色格式为BGR，0x0000FF00=绿色）
	const brush = CreateSolidBrush(0x0000FF00);
	if (!brush) {
		console.error("CreateSolidBrush 失败");
		ReleaseDC(null, hdc);
		koffi.free(rectBuffer); // 释放内存
		return;
	}

	// 填充整个屏幕为绿色（第二个参数传递RECT指针）
	const ret = FillRect(hdc, rectBuffer, brush); // 关键：rectBuffer是LPRECT指针
	if (ret === 0) {
		console.error("FillRect 失败（错误码：", koffi.errno(), "）");
	} else {
		console.log("FillRect 成功（屏幕已填充为绿色）");
	}

	// 释放资源（避免内存泄漏）
	DeleteObject(brush); // 释放画刷
	ReleaseDC(null, hdc); // 释放DC
	koffi.free(rectBuffer); // 释放RECT缓冲区
}

// 运行绘制函数
drawFullScreenRect();