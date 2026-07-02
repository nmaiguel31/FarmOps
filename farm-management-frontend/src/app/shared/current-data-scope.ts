export function getEntityId(entity: any): string {
  return String(entity?._id || entity?.id || entity || '');
}

export function isCurrentRecord(record: any): boolean {
  const status = String(record?.status || '').trim().toLowerCase();

  return !record?.deletedAt &&
    !record?.archivedAt &&
    !record?.isDeleted &&
    !record?.deleted &&
    status !== 'deleted' &&
    status !== 'archived';
}

export function getCurrentFarms(farms: any[] = []): any[] {
  return farms.filter(isCurrentRecord);
}

export function getCurrentFields(farms: any[] = [], fields: any[] = []): any[] {
  const farmIds =
    new Set(getCurrentFarms(farms).map(farm => getEntityId(farm)).filter(Boolean));

  return fields.filter(field =>
    isCurrentRecord(field) &&
    farmIds.has(getEntityId(field.farm))
  );
}

export function getCurrentZones(fields: any[] = [], zones: any[] = []): any[] {
  const fieldIds =
    new Set(fields.filter(isCurrentRecord).map(field => getEntityId(field)).filter(Boolean));

  return zones.filter(zone =>
    isCurrentRecord(zone) &&
    fieldIds.has(getEntityId(zone.field))
  );
}

export function getCurrentRecords(farms: any[] = [], records: any[] = []): any[] {
  const farmIds =
    new Set(getCurrentFarms(farms).map(farm => getEntityId(farm)).filter(Boolean));

  return records.filter(record =>
    isCurrentRecord(record) &&
    farmIds.has(getEntityId(record.farm))
  );
}

export function getCurrentCrops(farms: any[] = [], fields: any[] = [], crops: any[] = [], records: any[] = []): any[] {
  const farmIds =
    new Set(getCurrentFarms(farms).map(farm => getEntityId(farm)).filter(Boolean));
  const fieldCropIds =
    new Set(fields.map(field => getEntityId(field.crop)).filter(Boolean));
  const recordCropIds =
    new Set(records.map(record => getEntityId(record.crop)).filter(Boolean));

  return crops.filter(crop => {
    if (!isCurrentRecord(crop)) {
      return false;
    }

    const cropId = getEntityId(crop);
    const farmId = getEntityId(crop.farm);

    return (farmId && farmIds.has(farmId)) ||
      fieldCropIds.has(cropId) ||
      recordCropIds.has(cropId);
  });
}

export function getCurrentSignals(farms: any[] = [], fields: any[] = [], signals: any[] = []): any[] {
  const farmIds =
    new Set(getCurrentFarms(farms).map(farm => getEntityId(farm)).filter(Boolean));
  const fieldIds =
    new Set(fields.filter(isCurrentRecord).map(field => getEntityId(field)).filter(Boolean));

  return signals.filter(signal => {
    if (!isCurrentRecord(signal)) {
      return false;
    }

    const farmId = getEntityId(signal.farm);
    const fieldId = getEntityId(signal.field);

    if (fieldId && !fieldIds.has(fieldId)) {
      return false;
    }

    if (farmId && !farmIds.has(farmId)) {
      return false;
    }

    return true;
  });
}
