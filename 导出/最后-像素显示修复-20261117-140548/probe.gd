extends SceneTree
func _initialize():
 call_deferred("probe")
func probe():
 var report = {}
 for key in ["rendering/textures/canvas_textures/default_texture_filter", "display/window/stretch/mode", "display/window/stretch/scale_mode", "display/window/size/viewport_width", "display/window/size/viewport_height", "display/window/size/window_width_override", "display/window/size/window_height_override"]:
  report[key] = ProjectSettings.get_setting(key)
 for scene in ["res://主场景.tscn", "res://场景/便利店/便利店内部.tscn"]:
  var packed = load(scene) as PackedScene
  assert(packed != null, scene)
  var node = packed.instantiate()
  root.add_child(node)
  report[scene] = {"texture_filter": node.texture_filter, "viewport_filter": node.get_viewport().canvas_item_default_texture_filter}
  node.queue_free()
 print("PIXEL_REPORT=", JSON.stringify(report))
 quit()
