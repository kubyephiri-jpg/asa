import React, { useRef, useState } from 'react';
import { Animated, PanResponder, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

export interface SidePanelItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  /** small text under the icon, e.g. the float percentage */
  badge?: string;
  badgeColor?: string;
  onPress: () => void;
}

const PANEL_W = 82;
const HANDLE_W = 24;

/**
 * Pull-out panel on the left edge (like Uber / Yango). Drag or tap the little tab to slide it in and out.
 * Add more buttons later by adding items - nothing else to change.
 */
export default function SidePanel({ items, top = '34%' }: { items: SidePanelItem[]; top?: number | string }) {
  const x = useRef(new Animated.Value(-PANEL_W)).current; // closed: only the tab is visible
  const base = useRef(-PANEL_W);
  const [open, setOpen] = useState(false);

  const snap = (toOpen: boolean) => {
    base.current = toOpen ? 0 : -PANEL_W;
    setOpen(toOpen);
    Animated.timing(x, { toValue: base.current, duration: 180, useNativeDriver: false }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4,
      onPanResponderMove: (_e, g) => x.setValue(Math.max(-PANEL_W, Math.min(0, base.current + g.dx))),
      onPanResponderRelease: (_e, g) => {
        if (Math.abs(g.dx) < 6) { snap(base.current === 0 ? false : true); return; } // a tap toggles
        const current = Math.max(-PANEL_W, Math.min(0, base.current + g.dx));
        snap(g.vx > 0.3 ? true : g.vx < -0.3 ? false : current > -PANEL_W / 2);
      },
    })
  ).current;

  return (
    <Animated.View
      style={{ position: 'absolute', left: 0, top: top as any, flexDirection: 'row', alignItems: 'center', zIndex: 30, transform: [{ translateX: x }] }}
      pointerEvents="box-none"
    >
      <View style={{ width: PANEL_W, backgroundColor: '#ffffff', borderTopRightRadius: 18, borderBottomRightRadius: 0, paddingVertical: 10, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 2, height: 2 } }}>
        {items.map((item) => (
          <TouchableOpacity key={item.key} onPress={item.onPress} activeOpacity={0.8} style={{ alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: item.active ? '#EFEAFF' : 'transparent' }}>
            {item.icon}
            <Text style={{ fontSize: 11, fontWeight: '700', color: item.active ? '#5B2EFF' : '#18201b', marginTop: 4, textAlign: 'center' }}>{item.label}</Text>
            {item.badge ? <Text style={{ fontSize: 12, fontWeight: '800', color: item.badgeColor || '#18201b', marginTop: 1 }}>{item.badge}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
      <View
        {...pan.panHandlers}
        style={{ width: HANDLE_W, height: 64, backgroundColor: '#ffffff', borderTopRightRadius: 14, borderBottomRightRadius: 14, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4 }}
      >
        {open ? <ChevronLeft size={18} color="#5B2EFF" /> : <ChevronRight size={18} color="#5B2EFF" />}
      </View>
    </Animated.View>
  );
}
