extends SceneTree
func _initialize():
 call_deferred("verify")
func verify():
 var dir = "res://游戏资产/游戏内部/便利店/店面/"
 for stem in ["便利店-无雪", "便利店-雪顶"]:
  var texture = load(dir + stem + ".png") as Texture2D
  var animation = load(dir + stem + "-开门.png") as Texture2D
  assert(texture != null and animation != null)
  assert(animation.get_width() == texture.get_width() * 6 and animation.get_height() == texture.get_height())
  for path in [dir + stem + ".png", dir + stem + "-开门.png"]:
   var source = Image.load_from_file(ProjectSettings.globalize_path(path))
   var imported = (load(path) as Texture2D).get_image()
   source.convert(Image.FORMAT_RGBA8)
   imported.convert(Image.FORMAT_RGBA8)
   assert(source.get_size() == imported.get_size())
   for y in source.get_height():
    for x in source.get_width():
     var a = source.get_pixel(x,y)
     var b = imported.get_pixel(x,y)
     assert(is_equal_approx(a.a,b.a))
     if a.a > 0:
      assert(a.is_equal_approx(b))
  var closed = texture.get_image()
  var first = animation.get_image().get_region(Rect2i(0,0,texture.get_width(),texture.get_height()))
  closed.convert(Image.FORMAT_RGBA8)
  first.convert(Image.FORMAT_RGBA8)
  assert(closed.get_data() == first.get_data())
 print("STORE_IMPORT_OK png=4 frames=12 first_frames_match=true")
 quit()
