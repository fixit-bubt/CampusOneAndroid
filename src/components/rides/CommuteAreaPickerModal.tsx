import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  FlatList, ScrollView, StyleSheet, Keyboard, KeyboardAvoidingView,
  Platform, type ViewStyle, type TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { FontFamily, Layout, SectorColors, pillBg } from '../../theme';
import { LocationPickerModal } from '../location/LocationPickerModal';
import { findMasterLocationByName, searchMasterLocations } from '../../constants/dhakaMasterLocations';
import type { Coordinates } from '../../services/locationService';

const RIDE_COLOR = SectorColors.ride;

export interface CommuteAreaItem {
  name: string;
  nameBn?: string;
  zone: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
}

export const ALL_COMMUTE_HUBS: CommuteAreaItem[] = [
  // 1. Mirpur & Campus Vicinity (14)
  { name: 'Mirpur 10', nameBn: 'মিরপুর-১০', zone: 'Mirpur & Campus', desc: 'Metro Rail station · Main Mirpur roundabout', icon: 'navigation' },
  { name: 'Mirpur 2 (BUBT)', nameBn: 'মিরপুর-২', zone: 'Mirpur & Campus', desc: 'Sony Square · Commerce College road · BUBT campus', icon: 'map-pin' },
  { name: 'Sony Cinema', nameBn: 'সনি স্কয়ার', zone: 'Mirpur & Campus', desc: 'Sony Square roundabout & food corridor', icon: 'film' },
  { name: 'Rainkhola', nameBn: 'রাইনখোলা', zone: 'Mirpur & Campus', desc: 'Zoo road entrance · Close to campus', icon: 'compass' },
  { name: 'Mirpur 1', nameBn: 'মিরপুর-১', zone: 'Mirpur & Campus', desc: 'Muktodhara roundabout · Darussalam link', icon: 'map-pin' },
  { name: 'Mirpur 6', nameBn: 'মিরপুর-৬', zone: 'Mirpur & Campus', desc: 'Mirpur 6 roundabout & stadium corridor', icon: 'map-pin' },
  { name: 'Mirpur 11', nameBn: 'মিরপুর-১১', zone: 'Mirpur & Campus', desc: 'Metro Rail station · Purobi cinema hall', icon: 'navigation' },
  { name: 'Mirpur 12', nameBn: 'মিরপুর-১২', zone: 'Mirpur & Campus', desc: 'Metro Rail terminal · Bus depot', icon: 'navigation' },
  { name: 'Mirpur 14', nameBn: 'মিরপুর-১৪', zone: 'Mirpur & Campus', desc: 'BRTA office · Kachukhet link road', icon: 'map-pin' },
  { name: 'Pallabi', nameBn: 'পল্লবী', zone: 'Mirpur & Campus', desc: 'Metro Rail station · Section 12 link', icon: 'navigation' },
  { name: 'Rupnagar', nameBn: 'রূপনগর', zone: 'Mirpur & Campus', desc: 'Rupnagar R/A · Commerce College back gate', icon: 'home' },
  { name: 'Technical', nameBn: 'টেকনিক্যাল', zone: 'Mirpur & Campus', desc: 'Technical intersection · Gabtoli highway', icon: 'git-merge' },
  { name: 'Mirpur DOHS', nameBn: 'মিরপুর ডিওএইচএস', zone: 'Mirpur & Campus', desc: 'DOHS residential gate · Avenue 3/4', icon: 'shield' },
  { name: 'ECB Chattar', nameBn: 'ইসিবি চত্বর', zone: 'Mirpur & Campus', desc: 'Flyover exit · Matikata · Cantonment link', icon: 'map-pin' },

  // 2. North Dhaka (11)
  { name: 'Uttara (Sectors 1-18)', nameBn: 'উত্তরা', zone: 'North Dhaka', desc: 'House Building / Rajlakshmi / Metro North', icon: 'map' },
  { name: 'Banani', nameBn: 'বনানী', zone: 'North Dhaka', desc: 'Banani 11 · Kamal Ataturk Avenue · Kakoli', icon: 'map-pin' },
  { name: 'Gulshan-1', nameBn: 'গুলশান-১', zone: 'North Dhaka', desc: 'Gulshan 1 Circle · Shooting Club link', icon: 'navigation' },
  { name: 'Gulshan-2', nameBn: 'গুলশান-২', zone: 'North Dhaka', desc: 'Gulshan 2 Circle · Diplomatic Zone', icon: 'navigation' },
  { name: 'Baridhara', nameBn: 'বারিধারা', zone: 'North Dhaka', desc: 'Baridhara DOHS · J Block gate', icon: 'shield' },
  { name: 'Bashundhara R/A', nameBn: 'বসুন্ধরা আ/এ', zone: 'North Dhaka', desc: 'Main Gate · Jamuna Future Park · NSU/IUB', icon: 'map-pin' },
  { name: 'Mohakhali', nameBn: 'মহাখালী', zone: 'North Dhaka', desc: 'Flyover · Wireless Gate · Inter-district terminal', icon: 'navigation' },
  { name: 'Cantonment', nameBn: 'সেনানিবাস', zone: 'North Dhaka', desc: 'Sena Kunja · Adamjee / Jahangir Gate', icon: 'shield' },
  { name: 'Airport / Dakshinkhan', nameBn: 'বিমানবন্দর', zone: 'North Dhaka', desc: 'Hazrat Shahjalal Airport · Railway Station', icon: 'send' },
  { name: 'Kuril Flyover', nameBn: 'কুড়িল বিশ্বরোড', zone: 'North Dhaka', desc: 'Kuril Chowrasta · Purbachal 300 Feet link', icon: 'compass' },
  { name: 'Nikunja', nameBn: 'নিকুঞ্জ', zone: 'North Dhaka', desc: 'Nikunja 1 & 2 · Citycell link', icon: 'home' },

  // 3. Central & West Dhaka (11)
  { name: 'Dhanmondi', nameBn: 'ধানমন্ডি', zone: 'Central & West', desc: 'Russel Square / Shimanto Square / Road 27', icon: 'navigation' },
  { name: 'Mohammadpur', nameBn: 'মোহাম্মদপুর', zone: 'Central & West', desc: 'Town Hall / Shia Masjid / Ring Road', icon: 'map-pin' },
  { name: 'Shyamoli', nameBn: 'শ্যামলী', zone: 'Central & West', desc: 'Shyamoli Square · Ring Road footbridge', icon: 'map-pin' },
  { name: 'Kalyanpur', nameBn: 'কল্যাণপুর', zone: 'Central & West', desc: 'Bus stand · Rokeya Sarani transit', icon: 'navigation' },
  { name: 'Farmgate', nameBn: 'ফার্মগেট', zone: 'Central & West', desc: 'Ananda Cinema · Metro Rail station', icon: 'map-pin' },
  { name: 'Tejgaon', nameBn: 'তেজগাঁও', zone: 'Central & West', desc: 'Nabisco / Satrasta / Industrial Area', icon: 'navigation' },
  { name: 'Agargaon', nameBn: 'আগারগাঁও', zone: 'Central & West', desc: 'Passport Office · Biman Bhaban Metro', icon: 'compass' },
  { name: 'Adabor', nameBn: 'আদাবর', zone: 'Central & West', desc: 'Adabor 10/16 · Mohammadpur link', icon: 'home' },
  { name: 'Kalabagan', nameBn: 'কলাবাগান', zone: 'Central & West', desc: 'Kalabagan playground · Mirpur Road', icon: 'map-pin' },
  { name: 'Panthapath', nameBn: 'পান্থপথ', zone: 'Central & West', desc: 'Bashundhara City · Square Hospital link', icon: 'navigation' },
  { name: 'Sobhanbagh', nameBn: 'সোবহানবাগ', zone: 'Central & West', desc: 'Daffodil campus · Mirpur Road link', icon: 'map-pin' },

  // 4. East Dhaka (8)
  { name: 'Badda', nameBn: 'বাড্ডা', zone: 'East Dhaka', desc: 'Middle Badda · Link Road · Rampura canal', icon: 'map-pin' },
  { name: 'Rampura', nameBn: 'রামপুরা', zone: 'East Dhaka', desc: 'Rampura Bridge · TV Center · DIT Road', icon: 'navigation' },
  { name: 'Aftabnagar', nameBn: 'আফতাবনগর', zone: 'East Dhaka', desc: 'East West University gate · Block A/B', icon: 'home' },
  { name: 'Malibagh', nameBn: 'মালিবাগ', zone: 'East Dhaka', desc: 'Malibagh rail crossing · Mouchak market', icon: 'map-pin' },
  { name: 'Moghbazar', nameBn: 'মগবাজার', zone: 'East Dhaka', desc: 'Wireless crossing · Flyover junction', icon: 'navigation' },
  { name: 'Khilgaon', nameBn: 'খিলগাঁও', zone: 'East Dhaka', desc: 'Taltola · Shahid Baki Road restaurant street', icon: 'map-pin' },
  { name: 'Shantinagar', nameBn: 'শান্তিনগর', zone: 'East Dhaka', desc: 'Shantinagar intersection · Twin Towers', icon: 'navigation' },
  { name: 'Notun Bazar', nameBn: 'নতুন বাজার', zone: 'East Dhaka', desc: 'Madani Avenue · 100 Feet road link', icon: 'compass' },

  // 5. South & Old Dhaka (10)
  { name: 'Motijheel', nameBn: 'মতিঝিল', zone: 'South & Old', desc: 'Shapla Chattar · Commercial Hub · Metro', icon: 'briefcase' },
  { name: 'Paltan / Press Club', nameBn: 'পল্টন', zone: 'South & Old', desc: 'National Press Club · Baitul Mukarram', icon: 'map-pin' },
  { name: 'Kakrail', nameBn: 'কাকরাইল', zone: 'South & Old', desc: 'St. Marys Cathedral · Circuit House road', icon: 'map-pin' },
  { name: 'Wari', nameBn: 'ওয়ারী', zone: 'South & Old', desc: 'Rankin Street · Baldha Garden', icon: 'home' },
  { name: 'Sadarghat', nameBn: 'সদরঘাট', zone: 'South & Old', desc: 'Launch Terminal · Victoria Park / Jagannath Univ', icon: 'anchor' },
  { name: 'Lalbagh', nameBn: 'লালবাগ', zone: 'South & Old', desc: 'Lalbagh Fort · Azimpur bus stand', icon: 'shield' },
  { name: 'Chawkbazar', nameBn: 'চকবাজার', zone: 'South & Old', desc: 'Shahi Masjid · Old Dhaka central market', icon: 'map-pin' },
  { name: 'Jatrabari', nameBn: 'যাত্রাবাড়ী', zone: 'South & Old', desc: 'Flyover entrance · Sayedabad highway terminal', icon: 'navigation' },
  { name: 'Sayedabad', nameBn: 'সায়েদাবাদ', zone: 'South & Old', desc: 'Inter-district bus terminal · Janapath', icon: 'navigation' },
  { name: 'Shahbagh / DMCH', nameBn: 'শাহবাগ / ঢামেক', zone: 'South & Old', desc: 'Shahbagh intersection · Dhaka Medical College', icon: 'plus-circle' },

  // 6. Suburbs & Corridors (4)
  { name: 'Savar / Ashulia', nameBn: 'সাভার / আশুলিয়া', zone: 'Suburbs', desc: 'Savar Bazar · Baipail · Highway corridor', icon: 'map' },
  { name: 'Gabtoli', nameBn: 'গাবতলী', zone: 'Suburbs', desc: 'Gabtoli inter-district terminal · Mazar Road', icon: 'navigation' },
  { name: 'Hemayetpur', nameBn: 'হেমায়েতপুর', zone: 'Suburbs', desc: 'Dhaka-Aricha highway · Tannery road link', icon: 'compass' },
  { name: 'Gazipur Chowrasta', nameBn: 'গাজীপুর', zone: 'Suburbs', desc: 'Chowrasta intersection · Highway transit', icon: 'navigation' },
];

interface ZoneMeta {
  id: string;
  name: string;
  nameBn: string;
  subtitle: string;
  zoneKey: string;
}

const ZONE_METAS: ZoneMeta[] = [
  {
    id: 'mirpur',
    name: 'Mirpur & Campus',
    nameBn: 'মিরপুর ও ক্যাম্পাস এলাকা',
    subtitle: 'Mirpur 1, 2, 6, 10, Rupnagar, Pallabi',
    zoneKey: 'Mirpur & Campus',
  },
  {
    id: 'north',
    name: 'Mohakhali & Gulshan',
    nameBn: 'মহাখালী ও গুলশান',
    subtitle: 'Banani, Gulshan, Baridhara, Bashundhara',
    zoneKey: 'North Dhaka',
  },
  {
    id: 'central',
    name: 'Dhanmondi & West',
    nameBn: 'ধানমন্ডি ও পশ্চিম ঢাকা',
    subtitle: 'Panthapath, Green Rd, Shyamoli, Mohammadpur',
    zoneKey: 'Central & West',
  },
  {
    id: 'east',
    name: 'East Dhaka & Rampura',
    nameBn: 'রামপুরা ও পূর্ব ঢাকা',
    subtitle: 'Badda, Rampura, Aftabnagar, Malibagh, Khilgaon',
    zoneKey: 'East Dhaka',
  },
  {
    id: 'south',
    name: 'Old Dhaka & Sadarghat',
    nameBn: 'পুরান ঢাকা ও সদরঘাট',
    subtitle: 'Wari, Lalbagh, Armanitola, Chawkbazar',
    zoneKey: 'South & Old',
  },
  {
    id: 'suburbs',
    name: 'Greater Dhaka & Suburbs',
    nameBn: 'বৃহত্তর ঢাকা ও শহরতলি',
    subtitle: 'Savar, Gazipur, Keraniganj, Narayanganj',
    zoneKey: 'Suburbs',
  },
];

interface CommuteAreaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedArea: string;
  onSelectArea: (area: string, subLocation?: string, coords?: Coordinates) => void;
  title?: string;
  subtitle?: string;
  accentColor?: string;
  allowAll?: boolean;
}

export function CommuteAreaPickerModal({
  visible,
  onClose,
  selectedArea,
  onSelectArea,
  title = 'Commute Areas & Hubs',
  subtitle = 'Select pickup hub or destination in Dhaka',
  accentColor = RIDE_COLOR,
  allowAll = false,
}: CommuteAreaPickerModalProps) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [openZoneId, setOpenZoneId] = useState<string | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const activeColor = accentColor;

  useEffect(() => {
    if (visible) {
      setSearch('');
      if (selectedArea && selectedArea !== 'All') {
        const found = ALL_COMMUTE_HUBS.find(h => h.name.toLowerCase() === selectedArea.toLowerCase());
        if (found) {
          const zMatch = ZONE_METAS.find(m => m.zoneKey === found.zone);
          if (zMatch) setOpenZoneId(zMatch.id);
        }
      } else {
        setOpenZoneId(null);
      }
    }
  }, [visible, selectedArea]);

  const toggleZone = useCallback((zoneId: string) => {
    setOpenZoneId(prev => (prev === zoneId ? null : zoneId));
  }, []);

  const handleSelect = useCallback((areaName: string, subLoc?: string, explicitCoords?: Coordinates) => {
    let resolvedCoords = explicitCoords;
    if (!resolvedCoords && areaName && areaName !== 'All') {
      const match = findMasterLocationByName(areaName);
      if (match?.coords) {
        resolvedCoords = match.coords;
      }
    }
    onSelectArea(areaName, subLoc, resolvedCoords);
    onClose();
  }, [onSelectArea, onClose]);

  // Zero-delay in-memory master search (covers 800+ Dhaka verified spots + all commute hubs)
  const searchResults = useMemo(() => {
    const q = search.trim();
    if (!q) return [];

    const masterMatches = searchMasterLocations(q, 15);
    const qLower = q.toLowerCase();
    const hubMatches = ALL_COMMUTE_HUBS.filter(h =>
      h.name.toLowerCase().includes(qLower) ||
      (h.nameBn && h.nameBn.includes(qLower)) ||
      h.zone.toLowerCase().includes(qLower) ||
      h.desc.toLowerCase().includes(qLower)
    );

    const combined: Array<{
      name: string;
      nameBn?: string;
      zone: string;
      desc: string;
      icon: keyof typeof Feather.glyphMap;
      coords?: Coordinates;
    }> = [];

    const seen = new Set<string>();

    for (const h of hubMatches) {
      const key = h.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push({
          name: h.name,
          nameBn: h.nameBn,
          zone: h.zone,
          desc: h.desc,
          icon: h.icon,
          coords: findMasterLocationByName(h.name)?.coords,
        });
      }
    }

    for (const m of masterMatches) {
      const key = m.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        const iconName: keyof typeof Feather.glyphMap =
          m.category === 'transit' ? 'navigation' :
          m.category === 'university' ? 'book' :
          m.category === 'hospital' ? 'plus-circle' : 'map-pin';
        combined.push({
          name: m.name,
          nameBn: m.nameBn,
          zone: m.zone,
          desc: m.subLocation ? `${m.subLocation} · ${m.zone}` : (m.address || `${m.zone} · Verified Spot`),
          icon: iconName,
          coords: m.coords,
        });
      }
    }

    return combined;
  }, [search]);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={[styles.sheet, { backgroundColor: C.surface, borderColor: C.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Grab Handle */}
            <View style={[styles.handle, { backgroundColor: C.border }]} />

            {/* Header: Standardized Blood Donation / Explore Pattern */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerIcon, { backgroundColor: pillBg(activeColor, isDark) }]}>
                  <AnimatedIcon family="feather" name="map-pin" size={17} color={activeColor} animation="entrance" />
                </View>
                <View>
                  <Text style={[styles.headerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                    {title}
                  </Text>
                  <Text style={[styles.headerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]}>
                    {subtitle}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1 }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={16} color={C.text2} />
              </TouchableOpacity>
            </View>

            {/* 58dp Clean Interactive Map & GPS Trigger Card (100% Blood Parity) */}
            <TouchableOpacity
              style={[
                styles.mapTriggerCard58,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
              onPress={() => setMapPickerOpen(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.mapTriggerIconWrap, { backgroundColor: pillBg(activeColor, isDark) }]}>
                <AnimatedIcon family="feather" name="map" size={18} color={activeColor} animation="entrance" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mapTriggerTitle, { color: C.text, fontFamily: FontFamily.jakartaBold }]}>
                  Pick Area on Map
                </Text>
                <Text style={[styles.mapTriggerSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]}>
                  Pinpoint exact location or auto-detect with device GPS
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={activeColor} />
            </TouchableOpacity>

            {/* Search Box (Standard 58dp, 100% Blood Parity) */}
            <View style={[styles.searchBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <TouchableOpacity
                onPress={() => searchInputRef.current?.focus()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AnimatedIcon family="feather" name="search" size={18} color={activeColor} animation="entrance" />
              </TouchableOpacity>
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: C.text, fontFamily: FontFamily.jakartaMedium }]}
                placeholder="Search area (e.g. Mirpur, Dhanmondi, Sony)…"
                placeholderTextColor={C.textMuted}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                multiline={false}
                numberOfLines={1}
                returnKeyType="search"
                onSubmitEditing={() => {
                  if (search.trim()) {
                    handleSelect(search.trim());
                  }
                  Keyboard.dismiss();
                }}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={14} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Content: Search Results OR Zone Bars (100% Blood Parity) */}
            {search.trim().length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={item => item.name}
                ListHeaderComponent={
                  !ALL_COMMUTE_HUBS.some(h => h.name.toLowerCase() === search.trim().toLowerCase()) ? (
                    <TouchableOpacity
                      style={[
                        styles.childHospitalCard,
                        {
                          backgroundColor: isDark ? `${activeColor}26` : `${activeColor}12`,
                          borderColor: activeColor,
                          borderLeftColor: activeColor,
                        },
                      ]}
                      onPress={() => handleSelect(search.trim())}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.childIconBox, { backgroundColor: pillBg(activeColor, isDark) }]}>
                        <AnimatedIcon family="feather" name="plus" size={18} color={activeColor} animation="entrance" />
                      </View>
                      <View style={styles.childInfoStack}>
                        <Text style={[styles.childHospitalName, { color: activeColor, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          Use &ldquo;{search.trim()}&rdquo;
                        </Text>
                        <Text style={[styles.childHospitalSub, { color: C.textMuted, fontFamily: FontFamily.jakartaMedium }]} numberOfLines={1}>
                          Custom Dhaka landmark or meeting point
                        </Text>
                      </View>
                      <Feather name="arrow-right" size={16} color={activeColor} />
                    </TouchableOpacity>
                  ) : null
                }
                renderItem={({ item }) => {
                  const isSelected = selectedArea.trim().toLowerCase() === item.name.trim().toLowerCase();
                  return (
                    <TouchableOpacity
                      style={[
                        styles.childHospitalCard,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? `${activeColor}26` : `${activeColor}12`)
                            : C.surface,
                          borderColor: isSelected ? activeColor : C.border,
                          borderLeftColor: activeColor,
                        },
                      ]}
                      onPress={() => handleSelect(item.name, item.zone, item.coords)}
                      activeOpacity={0.72}
                    >
                      <View style={[styles.childIconBox, { backgroundColor: pillBg(activeColor, isDark) }]}>
                        <AnimatedIcon family="feather" name={item.icon} size={18} color={activeColor} animation="entrance" />
                      </View>
                      <View style={styles.childInfoStack}>
                        <Text style={[styles.childHospitalName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.childHospitalSub, { color: C.textMuted, fontFamily: FontFamily.bnRegular }]} numberOfLines={1}>
                          {item.nameBn ? `${item.nameBn} · ` : ''}{item.desc}
                        </Text>
                      </View>
                      {isSelected ? (
                        <AnimatedIcon family="feather" name="check-circle" size={18} color={activeColor} animation="spring" />
                      ) : (
                        <Feather name="chevron-right" size={16} color={activeColor} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                initialNumToRender={10}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                {ZONE_METAS.map(zoneMeta => {
                  const hubsInZone = ALL_COMMUTE_HUBS.filter(h => h.zone === zoneMeta.zoneKey);
                  const isOpen = openZoneId === zoneMeta.id;
                  const isSelected = selectedArea.trim().toLowerCase() === zoneMeta.name.trim().toLowerCase();
                  const activeBorderColor = isOpen || isSelected ? activeColor : C.border;

                  return (
                    <View key={zoneMeta.id} style={styles.zoneWrapper}>
                      {/* 72dp Explore/Blood-style Area Bar (Exact Parity with Screenshot 1) */}
                      <TouchableOpacity
                        style={[
                          styles.areaCardBar,
                          {
                            backgroundColor: isSelected
                              ? (isDark ? `${activeColor}26` : `${activeColor}12`)
                              : C.surface,
                            borderColor: activeBorderColor,
                            borderWidth: isOpen || isSelected ? 1.5 : 1,
                          },
                        ]}
                        onPress={() => toggleZone(zoneMeta.id)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.itemIconBox, { backgroundColor: pillBg(activeColor, isDark) }]}>
                          <AnimatedIcon family="feather" name="map-pin" size={20} color={activeColor} animation={isOpen ? 'spring' : 'entrance'} />
                        </View>
                        <View style={styles.itemInfoStack}>
                          <Text style={[styles.areaName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                            {zoneMeta.name}
                          </Text>
                          <Text style={[styles.areaSubName, { color: C.textMuted, fontFamily: FontFamily.jakartaRegular }]} numberOfLines={1}>
                            {zoneMeta.subtitle}
                          </Text>
                        </View>

                        {/* 1px Vertical Divider Line */}
                        <View style={[styles.verticalDivider, { backgroundColor: C.border }]} />

                        {/* Stat Column */}
                        <View style={styles.statCol}>
                          <Text style={[styles.statVal, { color: activeColor, fontFamily: FontFamily.jakartaExtraBold }]}>
                            {hubsInZone.length}
                          </Text>
                          <Text style={[styles.statSub, { color: C.textMuted, fontFamily: FontFamily.jakartaBold }]}>
                            HUBS
                          </Text>
                        </View>

                        {/* Far Right Animated Chevron */}
                        <View style={styles.chevronWrap}>
                          <AnimatedIcon
                            family="feather"
                            name={isOpen ? 'chevron-down' : 'chevron-right'}
                            size={18}
                            color={isOpen ? activeColor : C.textMuted}
                            animation={isOpen ? 'spring' : 'none'}
                          />
                        </View>
                      </TouchableOpacity>

                      {/* Expanded Child Container (Exact Parity with Screenshot 2: 72dp with 4.5dp Left Stripe) */}
                      {isOpen && (
                        <View style={styles.expandedChildContainer}>
                          {/* Select Entire Area Card (72dp with Left Accent Stripe) */}
                          <TouchableOpacity
                            style={[
                              styles.childHospitalCard,
                              {
                                backgroundColor: isSelected
                                  ? (isDark ? `${activeColor}26` : `${activeColor}12`)
                                  : C.surface,
                                borderColor: isSelected ? activeColor : C.border,
                                borderLeftColor: activeColor,
                              },
                            ]}
                            onPress={() => handleSelect(zoneMeta.name, zoneMeta.name)}
                            activeOpacity={0.72}
                          >
                            <View style={[styles.childIconBox, { backgroundColor: pillBg(activeColor, isDark) }]}>
                              <AnimatedIcon family="feather" name="map" size={18} color={activeColor} animation="entrance" />
                            </View>
                            <View style={styles.childInfoStack}>
                              <Text style={[styles.childHospitalName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                                Select Entire {zoneMeta.name}
                              </Text>
                              <Text style={[styles.childHospitalSub, { color: C.textMuted, fontFamily: FontFamily.bnRegular }]} numberOfLines={1}>
                                {zoneMeta.nameBn} · সকল রাইড হাব ও এলাকা
                              </Text>
                            </View>
                            {isSelected ? (
                              <AnimatedIcon family="feather" name="check-circle" size={18} color={activeColor} animation="spring" />
                            ) : (
                              <Feather name="chevron-right" size={16} color={activeColor} />
                            )}
                          </TouchableOpacity>

                          {/* Individual Hub Cards inside this Area (Each 72dp with Left Stripe) */}
                          {hubsInZone.map((hub) => {
                            const isHubSelected = selectedArea.trim().toLowerCase() === hub.name.trim().toLowerCase();
                            return (
                              <TouchableOpacity
                                key={hub.name}
                                style={[
                                  styles.childHospitalCard,
                                  {
                                    backgroundColor: isHubSelected
                                      ? (isDark ? `${activeColor}26` : `${activeColor}12`)
                                      : C.surface,
                                    borderColor: isHubSelected ? activeColor : C.border,
                                    borderLeftColor: activeColor,
                                  },
                                ]}
                                onPress={() => handleSelect(hub.name, zoneMeta.name, findMasterLocationByName(hub.name)?.coords)}
                                activeOpacity={0.72}
                              >
                                <View style={[styles.childIconBox, { backgroundColor: pillBg(activeColor, isDark) }]}>
                                  <AnimatedIcon family="feather" name={hub.icon} size={18} color={activeColor} animation="entrance" />
                                </View>
                                <View style={styles.childInfoStack}>
                                  <Text style={[styles.childHospitalName, { color: C.text, fontFamily: FontFamily.jakartaBold }]} numberOfLines={1}>
                                    {hub.name}
                                  </Text>
                                  <Text style={[styles.childHospitalSub, { color: C.textMuted, fontFamily: FontFamily.bnRegular }]} numberOfLines={1}>
                                    {hub.nameBn ? `${hub.nameBn} · ` : ''}{hub.desc}
                                  </Text>
                                </View>
                                {isHubSelected ? (
                                  <AnimatedIcon family="feather" name="check-circle" size={18} color={activeColor} animation="spring" />
                                ) : (
                                  <Feather name="chevron-right" size={16} color={activeColor} />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Embedded MapLibre Vector Map Picker Modal */}
      {mapPickerOpen && (
        <LocationPickerModal
          visible={mapPickerOpen}
          onClose={() => setMapPickerOpen(false)}
          accentColor={activeColor}
          title={title}
          initialPlaceName={selectedArea !== 'All' ? selectedArea : undefined}
          initialCoords={selectedArea !== 'All' ? findMasterLocationByName(selectedArea)?.coords : undefined}
          onSelectLocation={loc => {
            const locName = loc.name || loc.formattedAddress || 'Selected Location';
            const subLoc = loc.zone || loc.subText;
            setMapPickerOpen(false);
            handleSelect(locName, subLoc, loc.coords);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  } as ViewStyle,
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: Layout.screenPadding,
    maxHeight: '88%',
  } as ViewStyle,
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  } as ViewStyle,
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  headerTitle: {
    fontSize: 16,
  } as TextStyle,
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  } as TextStyle,
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // 58dp Map Trigger Card (100% Blood Parity)
  mapTriggerCard58: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  } as ViewStyle,
  mapTriggerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  mapTriggerTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    includeFontPadding: false,
  } as TextStyle,
  mapTriggerSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    includeFontPadding: false,
  } as TextStyle,

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 12,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  } as TextStyle,

  // Scroll Content
  listScroll: {
    maxHeight: 520,
  } as ViewStyle,
  listContent: {
    paddingBottom: 24,
  } as ViewStyle,

  // Zone Wrapper
  zoneWrapper: {
    marginBottom: 10,
  } as ViewStyle,

  // Standalone Card Bars (Standard 72dp Content Row: Explore featuredCard Parity - Exact Match to Screenshot 1)
  areaCardBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
  } as ViewStyle,
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  itemInfoStack: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 6,
  } as ViewStyle,
  areaName: {
    fontSize: 14.5,
    lineHeight: 20,
    includeFontPadding: false,
  } as TextStyle,
  areaSubName: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
    includeFontPadding: false,
  } as TextStyle,

  // Explore Screen Pattern: 1px Vertical Divider Line
  verticalDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 8,
  } as ViewStyle,

  // Explore Screen Pattern: Stat Column
  statCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  } as ViewStyle,
  statVal: {
    fontSize: 14,
    lineHeight: 17,
  } as TextStyle,
  statSub: {
    fontSize: 8.5,
    letterSpacing: 0.5,
    marginTop: 1,
  } as TextStyle,

  chevronWrap: {
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Expanded Child Container for Hubs inside the Area (Explore Parity: matching width, no awkward indent)
  expandedChildContainer: {
    marginTop: 8,
    marginBottom: 2,
  } as ViewStyle,

  // Child Hub Card (Explore-style 72dp Content Row with 4.5dp Left Stripe - Exact Match to Screenshot 2)
  childHospitalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    height: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4.5,
    marginBottom: 8,
  } as ViewStyle,
  childIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  childInfoStack: {
    flex: 1,
    justifyContent: 'center',
  } as ViewStyle,
  childHospitalName: {
    fontSize: 14,
    lineHeight: 19,
    includeFontPadding: false,
  } as TextStyle,
  childHospitalSub: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
    includeFontPadding: false,
  } as TextStyle,
});
