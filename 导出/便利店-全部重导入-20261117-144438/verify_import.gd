extends SceneTree
func _initialize():
 call_deferred("verify")
func check_node(node):
 if node is AnimatedSprite2D and node.sprite_frames != null:
  for anim in node.sprite_frames.get_animation_names():
   for i in node.sprite_frames.get_frame_count(anim):
    var tex = node.sprite_frames.get_frame_texture(anim, i)
    assert(tex != null)
    if tex is AtlasTexture:
     assert(tex.region.position.x >= 0 and tex.region.position.y >= 0)
     assert(tex.region.end.x <= tex.atlas.get_width() and tex.region.end.y <= tex.atlas.get_height())
 for child in node.get_children():
  check_node(child)
func verify():
 var paths = ["res://游戏资产/游戏内部/便利店/三张海报.png", "res://游戏资产/游戏内部/便利店/便利店-无雪-开门.png", "res://游戏资产/游戏内部/便利店/便利店-无雪.png", "res://游戏资产/游戏内部/便利店/便利店-雪顶-开门.png", "res://游戏资产/游戏内部/便利店/便利店-雪顶.png", "res://游戏资产/游戏内部/便利店/冰柜.png", "res://游戏资产/游戏内部/便利店/包子蒸柜.png", "res://游戏资产/游戏内部/便利店/壁挂烟架.png", "res://游戏资产/游戏内部/便利店/木绿收银台-右侧面-桌子电脑.png", "res://游戏资产/游戏内部/便利店/木绿收银台-右侧面-椅子.png", "res://游戏资产/游戏内部/便利店/木绿收银台-正面-桌子电脑.png", "res://游戏资产/游戏内部/便利店/木绿收银台-正面-椅子.png", "res://游戏资产/游戏内部/便利店/柜子.png", "res://游戏资产/游戏内部/便利店/烟架.png", "res://游戏资产/游戏内部/便利店/现代收银台-右侧面-桌子电脑.png", "res://游戏资产/游戏内部/便利店/现代收银台-右侧面-椅子.png", "res://游戏资产/游戏内部/便利店/现代收银台-正面-桌子电脑.png", "res://游戏资产/游戏内部/便利店/现代收银台-正面-椅子.png", "res://游戏资产/游戏内部/便利店/现代柜子.png", "res://游戏资产/游戏内部/便利店/自助咖啡机.png", "res://游戏资产/游戏内部/便利店/旧版店面/24h-MART-旧参考.png", "res://游戏资产/游戏内部/便利店/旧版店面/苹果24-旧设计.png", "res://游戏资产/游戏内部/便利店/双列陈列架.png", "res://游戏资产/游戏内部/便利店/冷柜-裁选.png"]
 for path in paths:
  var texture = load(path) as Texture2D
  assert(texture != null, path)
  var source = Image.load_from_file(ProjectSettings.globalize_path(path))
  assert(source != null)
  var imported = texture.get_image()
  assert(imported.get_size() == source.get_size(), path)
  source.convert(Image.FORMAT_RGBA8)
  imported.convert(Image.FORMAT_RGBA8)
  for y in source.get_height():
   for x in source.get_width():
    var a = source.get_pixel(x,y)
    var b = imported.get_pixel(x,y)
    assert(is_equal_approx(a.a,b.a), path)
    if a.a > 0.0:
     assert(a.is_equal_approx(b), path + " pixel " + str(Vector2i(x,y)))
 for scene in ["res://主场景.tscn","res://场景/便利店/便利店内部.tscn"]:
  var packed = load(scene) as PackedScene
  assert(packed != null)
  var node = packed.instantiate()
  root.add_child(node)
  check_node(node)
  node.queue_free()
 print("IMPORT_VERIFY_OK textures=", paths.size(), " scenes=2 atlas_regions_valid=true")
 quit()
