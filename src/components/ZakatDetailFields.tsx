import React, { memo, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type MetodePembayaran = 'beras' | 'uang';

export interface DetailForm {
  fitrah: { enabled: boolean; jumlah_jiwa: string; jumlah_uang: string; jumlah_beras: string; metode: MetodePembayaran; harga_beras_per_liter: string };
  mal: { enabled: boolean; jumlah_uang: string };
  infaq: { enabled: boolean; jumlah_uang: string };
  fidyah: { enabled: boolean; jumlah_uang: string; jumlah_beras: string; jumlah_jiwa: string; metode: MetodePembayaran; harga_beras_per_liter: string };
}

const LITER_PER_JIWA = 3.5;

export const emptyDetail = (): DetailForm => ({
  fitrah: { enabled: false, jumlah_jiwa: '1', jumlah_uang: '', jumlah_beras: '', metode: 'beras', harga_beras_per_liter: '' },
  mal: { enabled: false, jumlah_uang: '' },
  infaq: { enabled: false, jumlah_uang: '' },
  fidyah: { enabled: false, jumlah_uang: '', jumlah_beras: '', jumlah_jiwa: '1', metode: 'beras', harga_beras_per_liter: '' },
});

interface Props {
  detail: DetailForm;
  onChange: (updater: (prev: DetailForm) => DetailForm) => void;
  idPrefix?: string;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);

const FitrahFields = memo(function FitrahFields({
  fitrah,
  onToggle,
  onFieldChange,
  idPrefix,
}: {
  fitrah: DetailForm['fitrah'];
  onToggle: (v: boolean) => void;
  onFieldChange: (field: string, value: string) => void;
  idPrefix: string;
}) {
  const jiwa = Number(fitrah.jumlah_jiwa) || 0;
  const totalLiter = jiwa * LITER_PER_JIWA;
  const harga = Number(fitrah.harga_beras_per_liter) || 0;
  const uangDibayar = Number(fitrah.jumlah_uang) || 0;
  const setaraLiter = harga > 0 ? uangDibayar / harga : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox id={`${idPrefix}-fitrah`} checked={fitrah.enabled} onCheckedChange={v => onToggle(!!v)} />
        <Label htmlFor={`${idPrefix}-fitrah`} className="cursor-pointer font-medium">Zakat Fitrah</Label>
      </div>
      {fitrah.enabled && (
        <div className="ml-6 space-y-3">
          <div>
            <Label className="text-sm font-medium mb-2 block">Metode Pembayaran</Label>
            <RadioGroup value={fitrah.metode} onValueChange={v => onFieldChange('metode', v)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="beras" id={`${idPrefix}-fitrah-metode-beras`} />
                <Label htmlFor={`${idPrefix}-fitrah-metode-beras`} className="cursor-pointer">Beras</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="uang" id={`${idPrefix}-fitrah-metode-uang`} />
                <Label htmlFor={`${idPrefix}-fitrah-metode-uang`} className="cursor-pointer">Uang</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Harga Beras per Liter (Rp) <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              defaultValue={fitrah.harga_beras_per_liter}
              key={`${idPrefix}-fitrah-harga`}
              onBlur={e => onFieldChange('harga_beras_per_liter', e.target.value)}
              onChange={e => onFieldChange('harga_beras_per_liter', e.target.value)}
              placeholder="Contoh: 12000"
            />
          </div>

          <div>
            <Label>Jumlah Jiwa <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              defaultValue={fitrah.jumlah_jiwa}
              key={`${idPrefix}-jiwa`}
              onBlur={e => onFieldChange('jumlah_jiwa', e.target.value)}
              onChange={e => onFieldChange('jumlah_jiwa', e.target.value)}
            />
          </div>

          {fitrah.metode === 'uang' && (
            <div>
              <Label>Jumlah Uang (Rp) — otomatis dihitung</Label>
              <Input
                type="text"
                value={harga > 0 && jiwa > 0 ? `Rp ${fmt(jiwa * LITER_PER_JIWA * harga)}` : '—'}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>
          )}

          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            {fitrah.metode === 'beras' ? (
              <>
                <p><strong>{jiwa}</strong> jiwa × 3,5 liter = <strong>{totalLiter}</strong> Liter Beras</p>
                {harga > 0 && (
                  <p>Nilai setara: {totalLiter} × Rp {fmt(harga)} = <strong>Rp {fmt(totalLiter * harga)}</strong></p>
                )}
              </>
            ) : (
              <>
                {harga > 0 && jiwa > 0 ? (
                  <p><strong>{jiwa}</strong> jiwa × 3,5 liter × Rp {fmt(harga)}<br/>= <strong>Rp {fmt(jiwa * LITER_PER_JIWA * harga)}</strong></p>
                ) : (
                  <p className="text-muted-foreground">Isi jumlah jiwa dan harga beras untuk melihat perhitungan</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

const SimpleMoneyField = memo(function SimpleMoneyField({
  id,
  label,
  enabled,
  value,
  onToggle,
  onValueChange,
}: {
  id: string;
  label: string;
  enabled: boolean;
  value: string;
  onToggle: (v: boolean) => void;
  onValueChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox id={id} checked={enabled} onCheckedChange={v => onToggle(!!v)} />
        <Label htmlFor={id} className="cursor-pointer font-medium">{label}</Label>
      </div>
      {enabled && (
        <div className="ml-6">
          <Label>Jumlah Uang (Rp) <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            defaultValue={value}
            key={`${id}-${enabled}`}
            onBlur={e => onValueChange(e.target.value)}
            onChange={e => onValueChange(e.target.value)}
            placeholder="0"
          />
        </div>
      )}
    </div>
  );
});

const FidyahFields = memo(function FidyahFields({
  fidyah,
  onToggle,
  onFieldChange,
  idPrefix,
}: {
  fidyah: DetailForm['fidyah'];
  onToggle: (v: boolean) => void;
  onFieldChange: (field: string, value: string) => void;
  idPrefix: string;
}) {
  const jiwa = Number(fidyah.jumlah_jiwa) || 0;
  const totalLiter = jiwa * LITER_PER_JIWA;
  const harga = Number(fidyah.harga_beras_per_liter) || 0;
  const uangDibayar = Number(fidyah.jumlah_uang) || 0;
  const setaraLiter = harga > 0 ? uangDibayar / harga : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox id={`${idPrefix}-fidyah`} checked={fidyah.enabled} onCheckedChange={v => onToggle(!!v)} />
        <Label htmlFor={`${idPrefix}-fidyah`} className="cursor-pointer font-medium">Fidyah</Label>
      </div>
      {fidyah.enabled && (
        <div className="ml-6 space-y-3">
          <div>
            <Label className="text-sm font-medium mb-2 block">Metode Pembayaran</Label>
            <RadioGroup value={fidyah.metode} onValueChange={v => onFieldChange('metode', v)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="beras" id={`${idPrefix}-fidyah-metode-beras`} />
                <Label htmlFor={`${idPrefix}-fidyah-metode-beras`} className="cursor-pointer">Beras</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="uang" id={`${idPrefix}-fidyah-metode-uang`} />
                <Label htmlFor={`${idPrefix}-fidyah-metode-uang`} className="cursor-pointer">Uang</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Harga Beras per Liter (Rp) <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              defaultValue={fidyah.harga_beras_per_liter}
              key={`${idPrefix}-fidyah-harga`}
              onBlur={e => onFieldChange('harga_beras_per_liter', e.target.value)}
              onChange={e => onFieldChange('harga_beras_per_liter', e.target.value)}
              placeholder="Contoh: 12000"
            />
          </div>

          <div>
            <Label>Jumlah Jiwa <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              defaultValue={fidyah.jumlah_jiwa}
              key={`${idPrefix}-fidyah-jiwa`}
              onBlur={e => onFieldChange('jumlah_jiwa', e.target.value)}
              onChange={e => onFieldChange('jumlah_jiwa', e.target.value)}
            />
          </div>

          {fidyah.metode === 'uang' && (
            <div>
              <Label>Jumlah Uang Dibayar (Rp) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                defaultValue={fidyah.jumlah_uang}
                key={`${idPrefix}-fidyah-uang`}
                onBlur={e => onFieldChange('jumlah_uang', e.target.value)}
                onChange={e => onFieldChange('jumlah_uang', e.target.value)}
                placeholder="Contoh: 50000"
              />
            </div>
          )}

          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            {fidyah.metode === 'beras' ? (
              <>
                <p><strong>{jiwa}</strong> jiwa × 3,5 liter = <strong>{totalLiter}</strong> Liter Beras</p>
                {harga > 0 && (
                  <p>Nilai setara: {totalLiter} × Rp {fmt(harga)} = <strong>Rp {fmt(totalLiter * harga)}</strong></p>
                )}
              </>
            ) : (
              <>
                <p>Uang dibayar: <strong>Rp {fmt(uangDibayar)}</strong></p>
                {harga > 0 && uangDibayar > 0 && (
                  <p>Setara beras: Rp {fmt(uangDibayar)} ÷ Rp {fmt(harga)} = <strong>{parseFloat(setaraLiter.toFixed(2))} Liter</strong></p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

function ZakatDetailFields({ detail, onChange, idPrefix = 'zdf' }: Props) {
  const toggleFitrah = useCallback((v: boolean) => {
    onChange(d => ({ ...d, fitrah: { ...d.fitrah, enabled: v } }));
  }, [onChange]);

  const updateFitrahField = useCallback((field: string, value: string) => {
    onChange(prev => ({ ...prev, fitrah: { ...prev.fitrah, [field]: value } }));
  }, [onChange]);

  const toggleMal = useCallback((v: boolean) => {
    onChange(d => ({ ...d, mal: { ...d.mal, enabled: v } }));
  }, [onChange]);

  const updateMal = useCallback((v: string) => {
    onChange(d => ({ ...d, mal: { ...d.mal, jumlah_uang: v } }));
  }, [onChange]);

  const toggleInfaq = useCallback((v: boolean) => {
    onChange(d => ({ ...d, infaq: { ...d.infaq, enabled: v } }));
  }, [onChange]);

  const updateInfaq = useCallback((v: string) => {
    onChange(d => ({ ...d, infaq: { ...d.infaq, jumlah_uang: v } }));
  }, [onChange]);

  const toggleFidyah = useCallback((v: boolean) => {
    onChange(d => ({ ...d, fidyah: { ...d.fidyah, enabled: v } }));
  }, [onChange]);

  const updateFidyahField = useCallback((field: string, v: string) => {
    onChange(d => ({ ...d, fidyah: { ...d.fidyah, [field]: v } }));
  }, [onChange]);

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Jenis Zakat</Label>
      <FitrahFields fitrah={detail.fitrah} onToggle={toggleFitrah} onFieldChange={updateFitrahField} idPrefix={idPrefix} />
      <SimpleMoneyField id={`${idPrefix}-mal`} label="Zakat Mal" enabled={detail.mal.enabled} value={detail.mal.jumlah_uang} onToggle={toggleMal} onValueChange={updateMal} />
      <SimpleMoneyField id={`${idPrefix}-infaq`} label="Infaq" enabled={detail.infaq.enabled} value={detail.infaq.jumlah_uang} onToggle={toggleInfaq} onValueChange={updateInfaq} />
      <FidyahFields fidyah={detail.fidyah} onToggle={toggleFidyah} onFieldChange={updateFidyahField} idPrefix={idPrefix} />
    </div>
  );
}

export default memo(ZakatDetailFields);
