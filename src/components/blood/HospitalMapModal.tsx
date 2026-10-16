import { DirectionMapModal } from '../location/DirectionMapModal';
import { SectorColors } from '../../theme';
import type { Coordinates } from '../../services/locationService';

export interface HospitalMapModalProps {
  visible: boolean;
  onClose: () => void;
  hospital: string;
  area?: string;
  coords?: Coordinates;
}

export function HospitalMapModal({
  visible,
  onClose,
  hospital,
  area,
  coords,
}: HospitalMapModalProps) {
  return (
    <DirectionMapModal
      visible={visible}
      onClose={onClose}
      destination={hospital}
      destinationSub={area}
      destinationCoords={coords}
      title="Hospital Directions"
      sectorColor={SectorColors.blood}
      iconName="plus-circle"
      badgeText="Blood / Medical"
    />
  );
}
