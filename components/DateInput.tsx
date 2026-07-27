import React, { useMemo, useState } from 'react';
import { Modal, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { CalendarDays, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { formatDateISO, maskDateInput, parseISODate } from '../utils/datePeriod';
import { useAppText } from '../hooks/useAppText';
import { useAppTheme } from '../hooks/useAppTheme';

interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  editable?: boolean;
  showStepButtons?: boolean;
}

const WEEKDAYS = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  zh: ['Yi', 'Er', 'San', 'Si', 'Wu', 'Liu', 'Ri'],
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  it: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
  es: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
};

const MONTHS = {
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  zh: ['1 Yue', '2 Yue', '3 Yue', '4 Yue', '5 Yue', '6 Yue', '7 Yue', '8 Yue', '9 Yue', '10 Yue', '11 Yue', '12 Yue'],
  fr: ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'],
  de: ['Januar', 'Februar', 'Marz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
};

const CLOSE = {
  ru: 'Закрыть',
  en: 'Close',
  zh: 'Close',
  fr: 'Fermer',
  de: 'Schliessen',
  it: 'Chiudi',
  es: 'Cerrar',
};

export const DateInput = React.memo<DateInputProps>(({ label, value, onChange, placeholder, style, editable = true, showStepButtons = false }) => {
  const [visible, setVisible] = useState(false);
  const selectedDate = parseISODate(value) ?? new Date();
  const [viewDate, setViewDate] = useState(selectedDate);
  const palette = useAppTheme();
  const { lang } = useAppText();
  const locale = lang as keyof typeof WEEKDAYS;
  const weekdays = WEEKDAYS[locale] ?? WEEKDAYS.ru;
  const months = MONTHS[locale] ?? MONTHS.ru;

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: startOffset }, () => null),
      ...Array.from({ length: count }, (_, index) => new Date(year, month, index + 1)),
    ];
  }, [viewDate]);

  const shiftMonth = (delta: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  };

  const shiftYear = (delta: number) => {
    setViewDate(new Date(viewDate.getFullYear() + delta, viewDate.getMonth(), 1));
  };

  const shiftDay = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    onChange(formatDateISO(next));
  };

  const handleSelect = (date: Date) => {
    onChange(formatDateISO(date));
    setVisible(false);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputRow}>
        {showStepButtons && (
          <TouchableOpacity style={[styles.calendarButton, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => shiftDay(-1)}>
            <ChevronLeft size={22} color={palette.primary} />
          </TouchableOpacity>
        )}
        <Input
          label={label}
          value={value}
          onChangeText={(text) => editable && onChange(maskDateInput(text))}
          placeholder={placeholder ?? 'DD-MM-YYYY'}
          keyboardType="numeric"
          style={styles.input}
          editable={editable}
        />
        <TouchableOpacity
          style={[styles.calendarButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => {
            setViewDate(selectedDate);
            setVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <CalendarDays size={22} color={palette.primary} />
        </TouchableOpacity>
        {showStepButtons && (
          <TouchableOpacity style={[styles.calendarButton, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => shiftDay(1)}>
            <ChevronRight size={22} color={palette.primary} />
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.surface }]}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.navButton} onPress={() => shiftYear(-1)}>
                <ChevronsLeft size={20} color={palette.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} onPress={() => shiftMonth(-1)}>
                <ChevronLeft size={22} color={palette.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.monthTitle, { color: palette.textPrimary }]}>
                {months[viewDate.getMonth()]} {viewDate.getFullYear()}
              </Text>
              <TouchableOpacity style={styles.navButton} onPress={() => shiftMonth(1)}>
                <ChevronRight size={22} color={palette.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} onPress={() => shiftYear(1)}>
                <ChevronsRight size={20} color={palette.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {weekdays.map((day) => (
                <Text key={day} style={[styles.weekday, { color: palette.textSecondary }]}>{day}</Text>
              ))}
            </View>

            <View style={styles.dayGrid}>
              {days.map((date, index) => {
                const selected = date && formatDateISO(date) === value;
                return (
                  <TouchableOpacity
                    key={date ? formatDateISO(date) : `empty_${index}`}
                    disabled={!date}
                    style={[styles.dayCell, selected && { backgroundColor: palette.primaryContainer }]}
                    onPress={() => date && handleSelect(date)}
                  >
                    <Text style={[styles.dayText, { color: selected ? palette.primary : palette.textPrimary }, selected && styles.dayTextSelected]}>
                      {date ? date.getDate() : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button title={CLOSE[locale] ?? CLOSE.ru} variant="outline" onPress={() => setVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
});

DateInput.displayName = 'DateInput';

const styles = StyleSheet.create({
  container: { width: '100%' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1 },
  calendarButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { borderRadius: 16, padding: 18, gap: 14 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  dayText: { fontWeight: '600' },
  dayTextSelected: { fontWeight: '800' },
});
