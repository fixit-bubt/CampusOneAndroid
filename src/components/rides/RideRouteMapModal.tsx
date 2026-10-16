import { DirectionMapModal } from '../location/DirectionMapModal';
import { SectorColors } from '../../theme';
import type { Coordinates } from '../../services/locationService';

export interface RideRouteMapModalProps {
  visible: boolean;
  onClose: () => void;
  origin: string;
  destination: string;
  originCoords?: Coordinates | null;
  destCoords?: Coordinates | null;
  notes?: string | null;
  fare?: number;
  vehicle?: string;
  direction?: string;
}

export function RideRouteMapModal({
  visible,
  onClose,
  origin,
  destination,
  originCoords,
  destCoords,
  notes,
  fare,
  vehicle,
  direction,
}: RideRouteMapModalProps) {
  return (
    <DirectionMapModal
      visible={visible}
      onClose={onClose}
      origin={origin}
      destination={destination}
      originCoords={originCoords}
      destinationCoords={destCoords}
      notes={notes}
      fare={fare}
      vehicle={vehicle}
      title="Ride Route & Directions"
      sectorColor={SectorColors.ride}
      iconName="navigation"
      badgeText={vehicle || 'Campus Ride'}
    />
  );
}
