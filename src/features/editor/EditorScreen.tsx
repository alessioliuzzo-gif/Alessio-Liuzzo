/**
 * Der Foto-Editor. Das ganze Bild (Foto mit Filter, Rahmen, Texte, Sticker)
 * wird mit Skia auf eine Zeichenfläche gemalt. Beim Speichern wird genau diese
 * Fläche als JPEG exportiert: Was man sieht, wird gespeichert.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Canvas,
  ColorMatrix,
  Image as SkiaImage,
  ImageFormat,
  Paragraph,
  Rect,
  Skia,
  type SkParagraph,
  TextAlign,
  useCanvasRef,
  useImage,
} from "@shopify/react-native-skia";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Notice, Segmented } from "@/components/form";
import { AppText } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { toDateKey } from "@/features/calendar/month-grid";
import { saveDailyPhoto } from "@/features/photos/api";
import type { PhotoVisibility } from "@/lib/database.types";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/themes";

import { FILTERS, type FilterId, getFilter, type Unlock } from "./filters";
import { fitCanvas, PHOTO_ASPECT, type Size } from "./layout";
import {
  createSticker,
  createText,
  FRAMES,
  type FrameId,
  getFrame,
  hitTest,
  MAX_ITEMS,
  MAX_TEXT_LENGTH,
  moveItem,
  type OverlayItem,
  resizeItem,
  STICKERS,
  TEXT_COLORS,
} from "./model";

type Tool = "filter" | "frame" | "text" | "sticker";
const TOOLS: {
  id: Tool;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { id: "filter", icon: "color-filter-outline" },
  { id: "frame", icon: "square-outline" },
  { id: "text", icon: "text-outline" },
  { id: "sticker", icon: "happy-outline" },
];

/** Baut den Textblock für ein Element. Gibt null zurück, falls Schriften fehlen (Web). */
function buildParagraph(
  item: OverlayItem,
  canvasWidth: number,
): SkParagraph | null {
  try {
    const paragraph = Skia.ParagraphBuilder.Make({
      textAlign: TextAlign.Center,
    })
      .pushStyle({
        color: Skia.Color(item.color),
        fontSize: item.size * canvasWidth,
        fontStyle: { weight: 700 },
        // Leichter Schatten, damit Text auf hellen und dunklen Fotos lesbar bleibt.
        shadows:
          item.kind === "text"
            ? [
                {
                  color: Skia.Color("#00000099"),
                  blurRadius: 4,
                  offset: { x: 0, y: 1 },
                },
              ]
            : undefined,
      })
      .addText(item.text)
      .build();
    paragraph.layout(canvasWidth);
    return paragraph;
  } catch {
    return null;
  }
}

export default function EditorScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { uri } = useLocalSearchParams<{ uri?: string }>();

  const image = useImage(uri ?? null);
  const canvasRef = useCanvasRef();

  const [area, setArea] = useState<Size>({ width: 0, height: 0 });
  const canvas = useMemo(() => fitCanvas(area), [area]);

  const [tool, setTool] = useState<Tool>("filter");
  const [filterId, setFilterId] = useState<FilterId>("original");
  const [frameId, setFrameId] = useState<FrameId>("none");
  const [items, setItems] = useState<OverlayItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PhotoVisibility>("friends");
  const [draft, setDraft] = useState("");
  const [textColor, setTextColor] = useState<string>(TEXT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const frame = getFrame(frameId);
  const canAdd = items.length < MAX_ITEMS;

  const paragraphs = useMemo(
    () =>
      items.map((item) => ({
        item,
        paragraph: buildParagraph(item, canvas.width),
      })),
    [items, canvas.width],
  );

  // Verschieben mit dem Finger über das eingebaute "Responder"-System von
  // React Native. Wir merken uns beim Antippen, wo Finger und Element standen,
  // und rechnen daraus bei jeder Bewegung die neue Position.
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    pageX: number;
    pageY: number;
  } | null>(null);

  function onTouchStart(event: GestureResponderEvent) {
    if (canvas.width === 0) return;
    const { locationX, locationY, pageX, pageY } = event.nativeEvent;
    const point = { x: locationX / canvas.width, y: locationY / canvas.height };
    const hit = hitTest(items, point, PHOTO_ASPECT);
    drag.current = hit
      ? { id: hit.id, x: hit.x, y: hit.y, pageX, pageY }
      : null;
    setSelectedId(hit ? hit.id : null);
  }

  function onTouchMove(event: GestureResponderEvent) {
    const start = drag.current;
    if (!start || canvas.width === 0) return;
    const dx = (event.nativeEvent.pageX - start.pageX) / canvas.width;
    const dy = (event.nativeEvent.pageY - start.pageY) / canvas.height;
    setItems((list) =>
      list.map((item) =>
        item.id === start.id
          ? moveItem({ ...item, x: start.x, y: start.y }, dx, dy)
          : item,
      ),
    );
  }

  function addItem(item: OverlayItem) {
    setItems((list) => [...list, item]);
    setSelectedId(item.id);
  }

  function updateSelected(change: (item: OverlayItem) => OverlayItem) {
    if (!selectedId) return;
    setItems((list) =>
      list.map((item) => (item.id === selectedId ? change(item) : item)),
    );
  }

  /** Zurück zum "Heute"-Tab. Der Editor kann auch direkt geöffnet worden sein (kein Zurück möglich). */
  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/today');
  }

  async function save() {
    const userId = session?.user.id;
    if (!userId || !image || canvas.width === 0) return;
    setError(null);
    setSaving(true);
    try {
      // Auswahlrahmen ausblenden und einen Moment warten, bis neu gezeichnet ist.
      setSelectedId(null);
      await new Promise((resolve) => setTimeout(resolve, 80));
      const snapshot = await canvasRef.current?.makeImageSnapshotAsync();
      if (!snapshot) throw new Error("snapshot failed");
      const jpeg = snapshot.encodeToBytes(ImageFormat.JPEG, 88);
      await saveDailyPhoto({
        userId,
        day: toDateKey(new Date()),
        jpeg,
        visibility,
      });
      close();
    } catch {
      setError("editor.saveFailed");
      setSaving(false);
    }
  }

  const { width: W, height: H } = canvas;
  const [top, right, bottom, left] = frame.insets.map((inset) => inset * W);

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
          hitSlop={12}
          disabled={saving}
          onPress={close}
        >
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </Pressable>
        <AppText variant="heading">{t("editor.title")}</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View
        style={styles.stage}
        onLayout={(event: LayoutChangeEvent) => {
          const { width, height } = event.nativeEvent.layout;
          setArea({ width, height });
        }}
      >
        {W > 0 && (
          <View
            style={[
              styles.canvasBox,
              { width: W, height: H, backgroundColor: theme.colors.surfaceAlt },
            ]}
            onStartShouldSetResponder={() => true}
            onResponderGrant={onTouchStart}
            onResponderMove={onTouchMove}
            onResponderRelease={() => {
              drag.current = null;
            }}
          >
            <Canvas
              ref={canvasRef}
              style={{ width: W, height: H }}
              pointerEvents="none"
            >
              {image && (
                <SkiaImage
                  image={image}
                  x={0}
                  y={0}
                  width={W}
                  height={H}
                  fit="cover"
                >
                  <ColorMatrix matrix={[...getFilter(filterId).matrix]} />
                </SkiaImage>
              )}
              {top > 0 && (
                <Rect x={0} y={0} width={W} height={top} color={frame.color} />
              )}
              {bottom > 0 && (
                <Rect
                  x={0}
                  y={H - bottom}
                  width={W}
                  height={bottom}
                  color={frame.color}
                />
              )}
              {left > 0 && (
                <Rect x={0} y={0} width={left} height={H} color={frame.color} />
              )}
              {right > 0 && (
                <Rect
                  x={W - right}
                  y={0}
                  width={right}
                  height={H}
                  color={frame.color}
                />
              )}
              {paragraphs.map(({ item, paragraph }) =>
                paragraph ? (
                  <Paragraph
                    key={item.id}
                    paragraph={paragraph}
                    x={(item.x - 0.5) * W}
                    y={item.y * H - paragraph.getHeight() / 2}
                    width={W}
                  />
                ) : null,
              )}
            </Canvas>

            {!image && (
              <View style={styles.loading}>
                {uri ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : null}
              </View>
            )}

            {/* Auswahlmarke: ein normales View über der Zeichenfläche, darum nie im Export. */}
            {selected && (
              <View
                pointerEvents="none"
                style={[
                  styles.selection,
                  {
                    borderColor: theme.colors.primary,
                    left: selected.x * W - 14,
                    top: selected.y * H + selected.size * W * 0.75,
                  },
                ]}
              />
            )}
          </View>
        )}
      </View>

      {error && (
        <View style={styles.padded}>
          <Notice kind="error">{t(error)}</Notice>
        </View>
      )}

      {selected ? (
        <View style={styles.itemBar}>
          <IconButton
            icon="remove"
            label={t("editor.smaller")}
            onPress={() => updateSelected((i) => resizeItem(i, -1))}
          />
          <IconButton
            icon="add"
            label={t("editor.bigger")}
            onPress={() => updateSelected((i) => resizeItem(i, 1))}
          />
          <IconButton
            icon="trash-outline"
            label={t("editor.remove")}
            onPress={() => {
              setItems((list) => list.filter((item) => item.id !== selectedId));
              setSelectedId(null);
            }}
          />
          <IconButton
            icon="checkmark"
            label={t("editor.done")}
            onPress={() => setSelectedId(null)}
          />
        </View>
      ) : (
        <View style={styles.panel}>
          {tool === "filter" && (
            <ChipRow
              options={FILTERS.map((f) => ({
                id: f.id,
                label: t(`editor.filters.${f.id}`),
                unlock: f.unlock,
              }))}
              selected={filterId}
              onSelect={setFilterId}
            />
          )}
          {tool === "frame" && (
            <ChipRow
              options={FRAMES.map((f) => ({
                id: f.id,
                label: t(`editor.frames.${f.id}`),
                unlock: f.unlock,
              }))}
              selected={frameId}
              onSelect={setFrameId}
            />
          )}
          {tool === "text" && (
            <View style={styles.textTool}>
              <View style={styles.textRow}>
                <TextInput
                  accessibilityLabel={t("editor.textPlaceholder")}
                  placeholder={t("editor.textPlaceholder")}
                  placeholderTextColor={theme.colors.textMuted}
                  value={draft}
                  onChangeText={setDraft}
                  maxLength={MAX_TEXT_LENGTH}
                  returnKeyType="done"
                  style={[
                    styles.textInput,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                />
                <Button
                  label={t("editor.add")}
                  disabled={draft.trim() === "" || !canAdd}
                  onPress={() => {
                    addItem(createText(draft, textColor));
                    setDraft("");
                  }}
                />
              </View>
              <View style={styles.colors}>
                {TEXT_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    accessibilityRole="radio"
                    accessibilityLabel={color}
                    accessibilityState={{ selected: color === textColor }}
                    onPress={() => setTextColor(color)}
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: color,
                        borderColor:
                          color === textColor
                            ? theme.colors.primary
                            : theme.colors.border,
                        borderWidth: color === textColor ? 3 : 1,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
          {tool === "sticker" && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {STICKERS.map((emoji) => (
                <Pressable
                  key={emoji}
                  accessibilityRole="button"
                  accessibilityLabel={emoji}
                  disabled={!canAdd}
                  onPress={() => addItem(createSticker(emoji))}
                  style={[
                    styles.sticker,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                >
                  <AppText style={styles.stickerText}>{emoji}</AppText>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <View style={[styles.tools, { borderColor: theme.colors.border }]}>
        {TOOLS.map(({ id, icon }) => {
          const active = id === tool && !selected;
          const color = active ? theme.colors.primary : theme.colors.textMuted;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setSelectedId(null);
                setTool(id);
              }}
              style={styles.tool}
            >
              <Ionicons name={icon} size={22} color={color} />
              <AppText variant="caption" style={{ color }}>
                {t(`editor.tools.${id}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Segmented
          label={t("today.visibility")}
          value={visibility}
          onChange={setVisibility}
          options={[
            {
              value: "friends",
              label: t("today.visFriends"),
              icon: "people-outline",
            },
            {
              value: "public",
              label: t("today.visPublic"),
              icon: "earth-outline",
            },
          ]}
        />
        <Button
          label={t("editor.save")}
          onPress={save}
          loading={saving}
          disabled={!image}
        />
      </View>
    </SafeAreaView>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.iconButton,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Ionicons name={icon} size={24} color={theme.colors.text} />
    </Pressable>
  );
}

/** Waagrechte Auswahl. Noch nicht freigeschaltete Effekte zeigen ein Schloss. */
function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { id: T; label: string; unlock: Unlock }[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      {options.map(({ id, label, unlock }) => {
        const active = id === selected;
        // Phase 4 (Belohnungen) und Phase 9 (Abo) schalten diese Effekte frei.
        const locked = unlock !== "free";
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityLabel={
              locked ? `${label}, ${t("editor.locked")}` : label
            }
            accessibilityState={{ selected: active, disabled: locked }}
            disabled={locked}
            onPress={() => onSelect(id)}
            style={[
              styles.chip,
              {
                borderRadius: theme.radius.pill,
                borderColor: active
                  ? theme.colors.primary
                  : theme.colors.border,
                backgroundColor: active
                  ? theme.colors.primary
                  : theme.colors.surface,
                opacity: locked ? 0.55 : 1,
              },
            ]}
          >
            {locked && (
              <Ionicons
                name="lock-closed"
                size={14}
                color={theme.colors.textMuted}
              />
            )}
            <AppText
              variant="caption"
              style={{
                color: active ? theme.colors.onPrimary : theme.colors.text,
                fontWeight: "600",
              }}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    height: 48,
  },
  headerSpacer: { width: 28 },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.md,
  },
  canvasBox: { overflow: "hidden" },
  loading: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  selection: {
    position: "absolute",
    width: 28,
    height: 6,
    borderRadius: 3,
    borderWidth: 3,
  },
  padded: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  panel: { height: 96, justifyContent: "center" },
  itemBar: {
    height: 96,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  iconButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  textTool: { paddingHorizontal: spacing.md, gap: spacing.sm },
  textRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  textInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    fontSize: 16,
  },
  colors: { flexDirection: "row", gap: spacing.sm + spacing.xs },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  sticker: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  stickerText: { fontSize: 28, lineHeight: 36 },
  tools: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
  tool: { flex: 1, alignItems: "center", gap: 2, paddingVertical: spacing.sm },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});
