# 坐姿画布扩边与居中
仅坐姿16×17→20×19：左右各2、上方2、下方0。所有60个部件cel像素仅在新画布坐标平移(+2,+2)，没有缩放或重新绘制；底部距离逐像素保持，原先仅侧面下移的相对位置与所有动作/时长不变。源像素完整回环比较、0裁切；还原本次坐姿元数据和cels后完整JSON与原API相同。首帧三方向成图已目检。
PUT前重GET确认原ETag/字节，按原If-Match保存，PUT/GET200，readback逐字节等于candidate。未刷新前台，未修改按钮或其他动作。
原响应/SHA256/ETag见original.json和meta.json，保存版本见verification-saved.json。需恢复时，只有API仍等于保存ETag才可按其If-Match PUT original后回读；已有后续编辑则先合并本次坐姿扩边差异，不用旧整稿覆盖后来改动。未执行回滚。
