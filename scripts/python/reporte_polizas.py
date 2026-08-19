"""
Genera un reporte en Excel con las polizas cargadas en la base de datos SQLite
del sistema (database/polizas.db), pensado para auditorias o control mensual.

Uso:
    python scripts/python/reporte_polizas.py
"""
import sqlite3
import os
from datetime import datetime

import pandas as pd

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DB_PATH = os.path.join(BASE_DIR, 'database', 'polizas.db')
OUTPUT_DIR = os.path.join(BASE_DIR, 'reportes')


def generar_reporte():
    if not os.path.exists(DB_PATH):
        print(f"No se encontro la base de datos en {DB_PATH}")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    query = """
        SELECT
            p.numero AS "Numero",
            p.tipo AS "Tipo",
            o.nombre AS "Obra",
            o.comitente AS "Comitente",
            a.razonSocial AS "Aseguradora",
            p.monto AS "Monto",
            p.moneda AS "Moneda",
            p.fechaEmision AS "Fecha Emision",
            p.fechaVencimiento AS "Fecha Vencimiento",
            p.estado AS "Estado"
        FROM polizas p
        LEFT JOIN obras o ON p.obraId = o.id
        LEFT JOIN aseguradoras a ON p.aseguradoraId = a.id
        ORDER BY p.fechaVencimiento ASC
    """
    df = pd.read_sql_query(query, conn)
    conn.close()

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_path = os.path.join(OUTPUT_DIR, f'reporte_polizas_{timestamp}.xlsx')
    df.to_excel(output_path, index=False)

    print(f"Reporte generado: {output_path}")
    print(f"Total de polizas: {len(df)}")


if __name__ == '__main__':
    generar_reporte()
