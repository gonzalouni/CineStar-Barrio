import { useMemo } from 'react';
import '../../styles/seatmap.css';

interface Seat {
  ID: number;
  FILA: string;
  NUMERO: number;
  TIPO: string;
  SECCION: string;
  ESTADO: string;
}

interface SeatMapProps {
  seats: Seat[];
  selectedSeats: number[];
  onSeatClick: (seatId: number) => void;
  disabled?: boolean;
}

export default function SeatMap({ seats, selectedSeats, onSeatClick, disabled = false }: SeatMapProps) {
  // Group seats by row, then separate by section
  const rows = useMemo(() => {
    const rowMap = new Map<string, { principal: Seat[]; lateral: Seat[] }>();

    seats.forEach(seat => {
      if (!rowMap.has(seat.FILA)) {
        rowMap.set(seat.FILA, { principal: [], lateral: [] });
      }
      const row = rowMap.get(seat.FILA)!;
      if (seat.SECCION === 'LATERAL') {
        row.lateral.push(seat);
      } else {
        row.principal.push(seat);
      }
    });

    // Sort rows alphabetically and seats by number
    const sorted = Array.from(rowMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fila, sections]) => ({
        fila,
        principal: sections.principal.sort((a, b) => a.NUMERO - b.NUMERO),
        lateral: sections.lateral.sort((a, b) => a.NUMERO - b.NUMERO),
      }));

    return sorted;
  }, [seats]);

  const getSeatClass = (seat: Seat) => {
    const classes = ['seat'];

    if (seat.TIPO === 'SILLA_RUEDAS') classes.push('seat-wheelchair');

    if (selectedSeats.includes(seat.ID)) {
      classes.push('seat-selected');
    } else if (seat.ESTADO === 'OCUPADO' || seat.ESTADO === 'RESERVADO') {
      classes.push('seat-occupied');
    } else {
      classes.push('seat-available');
    }

    if (disabled) classes.push('seat-disabled');

    return classes.join(' ');
  };

  const handleClick = (seat: Seat) => {
    if (disabled) return;
    if (seat.ESTADO === 'OCUPADO' || seat.ESTADO === 'RESERVADO') return;
    onSeatClick(seat.ID);
  };

  return (
    <div className="seat-map-container">
      {/* Screen */}
      <div className="screen-indicator">
        <span>Pantalla</span>
      </div>

      {/* Seats Grid */}
      <div className="seats-grid">
        {rows.map(row => (
          <div className="seat-row" key={row.fila}>
            {/* Left label */}
            <span className="row-label row-label-left">{row.fila}</span>

            {/* Principal section */}
            <div className="seats-section seats-section-principal">
              {row.principal.map(seat => (
                <button
                  key={seat.ID}
                  className={getSeatClass(seat)}
                  onClick={() => handleClick(seat)}
                  data-label={`${seat.FILA}${seat.NUMERO}`}
                  title={`${seat.FILA}${seat.NUMERO} - ${
                    selectedSeats.includes(seat.ID) ? 'Seleccionado' :
                    seat.ESTADO === 'OCUPADO' ? 'Ocupado' :
                    seat.ESTADO === 'RESERVADO' ? 'Reservado' : 'Disponible'
                  }${seat.TIPO === 'SILLA_RUEDAS' ? ' (Silla de ruedas)' : ''}`}
                  disabled={disabled || seat.ESTADO === 'OCUPADO' || seat.ESTADO === 'RESERVADO'}
                  aria-label={`Asiento ${seat.FILA}${seat.NUMERO}`}
                />
              ))}
            </div>

            {/* Aisle */}
            <div className="seats-aisle" />

            {/* Lateral section */}
            <div className="seats-section seats-section-lateral">
              {row.lateral.map(seat => (
                <button
                  key={seat.ID}
                  className={getSeatClass(seat)}
                  onClick={() => handleClick(seat)}
                  data-label={`${seat.FILA}${seat.NUMERO}`}
                  title={`${seat.FILA}${seat.NUMERO} - ${
                    selectedSeats.includes(seat.ID) ? 'Seleccionado' :
                    seat.ESTADO === 'OCUPADO' ? 'Ocupado' :
                    seat.ESTADO === 'RESERVADO' ? 'Reservado' : 'Disponible'
                  }`}
                  disabled={disabled || seat.ESTADO === 'OCUPADO' || seat.ESTADO === 'RESERVADO'}
                  aria-label={`Asiento ${seat.FILA}${seat.NUMERO}`}
                />
              ))}
            </div>

            {/* Right label */}
            <span className="row-label row-label-right">{row.fila}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="seat-legend">
        <div className="legend-item">
          <div className="legend-dot legend-dot-available" />
          <span>Disponible</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot legend-dot-occupied" />
          <span>Ocupada</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot legend-dot-selected" />
          <span>Seleccionada</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot legend-dot-wheelchair">♿</div>
          <span>Silla de ruedas</span>
        </div>
      </div>
    </div>
  );
}
