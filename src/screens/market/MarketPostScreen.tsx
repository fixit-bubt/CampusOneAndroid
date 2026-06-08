// Matches design screens-e.jsx — MarketPost (create/edit listing)
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Switch,
  StyleSheet, Alert, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { SubBar } from '../../components/layout/TopBar';
import { Icon } from '../../components/ui/Icon';
import { FontFamily, Layout, Radius } from '../../theme';
import { supabase } from '../../lib/supabase';
import type { Listing } from '../../types/database';

const CATEGORIES: { id: Listing['category']; label: string; icon: string; color: string }[] = [
  { id: 'Books',       label: 'Books',       icon: 'book-open', color: '#2b5be3' },
  { id: 'Electronics', label: 'Electronics', icon: 'cpu',       color: '#8b5cf6' },
  { id: 'Furniture',   label: 'Furniture',   icon: 'layers',    color: '#b9760a' },
  { id: 'Notes',       label: 'Notes',       icon: 'file-text', color: '#0e9c8a' },
  { id: 'Other',       label: 'Other',       icon: 'package',   color: '#64748b' },
];

const CONDITIONS: { id: Listing['condition']; label: string }[] = [
  { id: 'New',      label: 'New' },
  { id: 'Like New', label: 'Like New' },
  { id: 'Used',     label: 'Used' },
];

export function MarketPostScreen({ route, navigation }: any) {
  const { listing } = (route.params ?? {}) as { listing?: Listing };
  const { C } = useTheme();
  const { user } = useAuth();

  const [cat, setCat] = useState<Listing['category'] | null>(listing?.category ?? null);
  const [title, setTitle] = useState(listing?.title ?? '');
  const [price, setPrice] = useState(listing?.price ? String(listing.price) : '');
  const [condition, setCondition] = useState<Listing['condition']>(listing?.condition ?? 'Used');
  const [negotiable, setNegotiable] = useState(listing?.negotiable ?? true);
  const [desc, setDesc] = useState(listing?.description ?? '');
  const [loading, setLoading] = useState(false);

  const isEdit = !!listing;
  const canSubmit = cat !== null && title.trim() && price.trim();

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    setLoading(true);
    try {
      const payload = {
        title:       title.trim(),
        price:       parseInt(price, 10) || 0,
        category:    cat,
        condition,
        negotiable,
        description: desc.trim(),
        seller_id:   user.id,
        status:      'Available' as Listing['status'],
      };
      if (isEdit) {
        const { error } = await supabase.from('listings').update(payload).eq('id', listing!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('listings').insert(payload);
        if (error) throw error;
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save listing. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <SubBar
        title={isEdit ? 'Edit Listing' : 'Sell an Item'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Layout.screenPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>CATEGORY</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map(c => {
            const on = cat === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.catBtn,
                  { borderColor: on ? c.color : C.border, backgroundColor: on ? c.color + '1a' : C.surface },
                ]}
                onPress={() => setCat(c.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.catIcon, { backgroundColor: c.color + (on ? '2e' : '18') }]}>
                  <Feather name={c.icon as any} size={16} color={c.color} />
                </View>
                <Text style={[styles.catLabel, { color: on ? c.color : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>ITEM NAME</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Scientific calculator"
          placeholderTextColor={C.textMuted}
        />

        {/* Price */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>PRICE (৳)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={price}
          onChangeText={t => setPrice(t.replace(/\D/g, ''))}
          placeholder="1500"
          placeholderTextColor={C.textMuted}
          keyboardType="numeric"
        />

        {/* Condition */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>CONDITION</Text>
        <View style={[styles.segRow, { backgroundColor: C.surface2, borderColor: C.border }]}>
          {CONDITIONS.map(c => {
            const on = condition === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.segBtn, on && { backgroundColor: C.brand }]}
                onPress={() => setCondition(c.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.segText, { color: on ? '#fff' : C.text2, fontFamily: FontFamily.jakartaBold }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Negotiable */}
        <View style={[styles.switchRow, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.switchLabel, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>Negotiable</Text>
          <Switch
            value={negotiable}
            onValueChange={setNegotiable}
            trackColor={{ false: C.border, true: C.brand }}
            thumbColor="#fff"
          />
        </View>

        {/* Description */}
        <Text style={[styles.label, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>DESCRIPTION</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: C.surface, borderColor: C.border, color: C.text, fontFamily: FontFamily.jakartaMedium }]}
          value={desc}
          onChangeText={setDesc}
          placeholder="Describe the item — condition details, what's included, etc."
          placeholderTextColor={C.textMuted}
          multiline
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? C.brand : C.surface2, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          <Icon name="check" size={18} color={canSubmit ? '#fff' : C.textMuted} />
          <Text style={[styles.submitText, { color: canSubmit ? '#fff' : C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
            {isEdit ? 'Save changes' : 'Post listing'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 } as ViewStyle,
  scroll: { paddingTop: 12, paddingBottom: 20 } as ViewStyle,

  label: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 2,
  } as any,

  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,

  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  } as ViewStyle,

  catIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  catLabel: { fontSize: 13 } as any,

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14.5,
  } as any,

  segRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  } as ViewStyle,

  segBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  } as ViewStyle,

  segText: { fontSize: 13.5 } as any,

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  } as ViewStyle,

  switchLabel: { fontSize: 14.5 } as any,

  textarea: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    fontSize: 14.5,
    lineHeight: 22,
  } as any,

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginTop: 22,
  } as ViewStyle,

  submitText: { fontSize: 15 } as any,
});
