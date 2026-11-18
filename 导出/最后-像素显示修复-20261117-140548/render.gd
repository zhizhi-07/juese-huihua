extends SceneTree
func _initialize():
 call_deferred("render")
func render():
 var output = get_script().resource_path.get_base_dir()
 var packed = load("res://场景/便利店/便利店内部.tscn") as PackedScene
 var views = []
 for mode in [1, 0]:
  var vp = SubViewport.new()
  vp.size = Vector2i(480, 320)
  vp.disable_3d = true
  vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
  vp.canvas_item_default_texture_filter = mode
  root.add_child(vp)
  var scene = packed.instantiate()
  vp.add_child(scene)
  var bounds = Rect2()
  var first = true
  for child in scene.get_children():
   if child is TileMapLayer:
    var used = child.get_used_rect()
    var cell = Vector2(child.tile_set.tile_size)
    var rect = Rect2(Vector2(used.position) * cell, Vector2(used.size) * cell)
    bounds = rect if first else bounds.merge(rect)
    first = false
  var camera = Camera2D.new()
  camera.position = bounds.get_center()
  camera.zoom = Vector2(3, 3)
  scene.add_child(camera)
  camera.make_current()
  views.append(vp)
 for i in range(5):
  await process_frame
  await RenderingServer.frame_post_draw
 for i in range(2):
  var image = views[i].get_texture().get_image()
  assert(not image.is_empty())
  var result = image.save_png(output.path_join("linear.png" if i == 0 else "nearest.png"))
  assert(result == OK)
 print("RENDER_OK")
 quit()
