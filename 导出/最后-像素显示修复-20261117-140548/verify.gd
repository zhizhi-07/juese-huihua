extends SceneTree
func _initialize():
 call_deferred("verify")
func verify():
 assert(ProjectSettings.get_setting("rendering/textures/canvas_textures/default_texture_filter") == 0)
 assert(ProjectSettings.get_setting("display/window/stretch/mode") == "viewport")
 assert(ProjectSettings.get_setting("display/window/stretch/scale_mode") == "integer")
 for path in ["res://主场景.tscn", "res://场景/便利店/便利店内部.tscn"]:
  var scene = load(path) as PackedScene
  assert(scene != null)
  var node = scene.instantiate()
  root.add_child(node)
  assert(node.get_viewport().canvas_item_default_texture_filter == Viewport.DEFAULT_CANVAS_ITEM_TEXTURE_FILTER_NEAREST)
  node.queue_free()
 print("PIXEL_ASSERTIONS_OK")
 quit()
