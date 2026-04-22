#!/usr/bin/env python3
"""
Streamlit Dashboard for Agricultural IoT System
Displays sensor data by crop zones with metrics and visualizations
"""

import os
import streamlit as st
import requests
import pandas as pd
import plotly.graph_objects as go
from datetime import datetime


# Configuration
API_URL = os.getenv("API_URL", "http://localhost:5000")
MQTT_BROKER = os.getenv("MQTT_BROKER", "mqtt")
MQTT_PORT = os.getenv("MQTT_PORT", "1883")
WILDCARD_TOPIC = "campo/+/sensores"

# Icons por zona
ICONOS = {
    "tomate": "🍅",
    "zanahoria": "🥕",
    "maiz": "🌽"
}


# Cache function to fetch zones dynamically
@st.cache_data(ttl=10)
def obtener_zonas():
    """Fetch available zones from API"""
    try:
        r = requests.get(f"{API_URL}/zonas", timeout=3)
        return r.json() if r.ok else []
    except Exception as e:
        st.error(f"Error fetching zones: {e}")
        return []


@st.cache_data(ttl=10)
def obtener_logs(zona=None):
    """Fetch logs from API"""
    try:
        if zona:
            url = f"{API_URL}/logs/{zona}"
        else:
            url = f"{API_URL}/logs"
        r = requests.get(url, timeout=3)
        return r.json() if r.ok else []
    except Exception as e:
        st.error(f"Error fetching logs: {e}")
        return []


def mostrar_metricas(zona, datos):
    """Display metrics for a zone"""
    if not datos:
        st.info(f"No data available for {zona}")
        return

    df = pd.DataFrame(datos)

    col1, col2, col3 = st.columns(3)

    with col1:
        temp_promedio = df["temperatura"].mean()
        st.metric("🌡️ Temp. Promedio", f"{temp_promedio:.2f}°C")

    with col2:
        humedad_promedio = df["humedad"].mean()
        st.metric("💧 Humedad Promedio", f"{humedad_promedio:.2f}%")

    with col3:
        cantidad = len(df)
        st.metric("📊 Lecturas", cantidad)


def mostrar_grafico_zona(zona, datos):
    """Display graph for a zone"""
    if not datos:
        st.info("No data to display")
        return

    df = pd.DataFrame(datos)
    # Convert timestamp string to datetime if needed
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values("timestamp")

    fig = go.Figure()

    # Temperature line
    fig.add_trace(go.Scatter(
        x=df["timestamp"],
        y=df["temperatura"],
        mode="lines+markers",
        name="Temperatura (°C)",
        line=dict(color="red", width=2),
        marker=dict(size=6)
    ))

    # Humidity line
    fig.add_trace(go.Scatter(
        x=df["timestamp"],
        y=df["humedad"],
        mode="lines+markers",
        name="Humedad (%)",
        line=dict(color="blue", width=2),
        marker=dict(size=6),
        yaxis="y2"
    ))

    fig.update_layout(
        title=f"Evolución de Sensores - {zona.capitalize()}",
        xaxis_title="Timestamp",
        yaxis_title="Temperatura (°C)",
        yaxis2=dict(
            title="Humedad (%)",
            overlaying="y",
            side="right",
            range=[0, 100]
        ),
        hovermode="x unified",
        height=400
    )

    st.plotly_chart(fig, use_container_width=True)


def mostrar_tabla(zona, datos):
    """Display data table for a zone"""
    if not datos:
        st.info("No data to display")
        return

    df = pd.DataFrame(datos)
    # Select relevant columns
    columnas = ["sensor_id", "zona", "temperatura", "humedad", "timestamp", "topic", "qos"]
    df_mostrar = df[[col for col in columnas if col in df.columns]]

    st.subheader(f"Últimos registros - {zona.capitalize()}")
    st.dataframe(df_mostrar, use_container_width=True, height=300)


def main():
    """Main dashboard"""
    st.set_page_config(
        page_title="IoT Agrícola Dashboard",
        page_icon="🌾",
        layout="wide",
        initial_sidebar_state="expanded"
    )

    # Title
    st.title("🌾 Sistema IoT Agrícola")
    st.subheader("Dashboard de Monitoreo por Zonas de Cultivo")

    # Sidebar
    with st.sidebar:
        st.header("ℹ️ Información del Sistema")
        st.write(f"**Broker MQTT:** {MQTT_BROKER}:{MQTT_PORT}")
        st.write(f"**Topic Pattern:** {WILDCARD_TOPIC}")
        st.write(f"**API URL:** {API_URL}")

        # Auto-refresh toggle
        auto_refresh = st.toggle("🔄 Auto-actualizar cada 10s", value=False)
        if auto_refresh:
            st.info("Auto-actualización habilitada")
            import time
            time.sleep(10)
            st.rerun()

    # Fetch zones
    zonas = obtener_zonas()

    if not zonas:
        st.warning("⚠️ No hay zonas disponibles. Espera a que los sensores publiquen datos.")
        st.info("Los sensores deben estar publicando en topics: campo/tomate/sensores, etc.")
        return

    # Create tabs: one per zone + global
    tab_labels = [f"{ICONOS.get(z, '🌱')} {z.capitalize()}" for z in zonas]
    tab_labels.append("🌍 Todas las zonas")

    tabs = st.tabs(tab_labels)

    # Individual zone tabs
    for idx, zona in enumerate(zonas):
        with tabs[idx]:
            st.header(f"{ICONOS.get(zona, '🌱')} {zona.capitalize()}")

            # Topic info
            col1, col2 = st.columns(2)
            with col1:
                st.write(f"**Topic MQTT:** `campo/{zona}/sensores`")
            with col2:
                st.write(f"**Wildcard:** `{WILDCARD_TOPIC}`")

            # Fetch zone data
            datos = obtener_logs(zona)

            if datos:
                # Metrics
                st.subheader("📊 Métricas")
                mostrar_metricas(zona, datos)

                # Graph
                st.subheader("📈 Gráficos")
                mostrar_grafico_zona(zona, datos)

                # Table
                st.subheader("📋 Datos")
                mostrar_tabla(zona, datos)
            else:
                st.info(f"Sin datos para zona: {zona}")

    # Global tab
    with tabs[-1]:
        st.header("🌍 Todas las Zonas")

        # Fetch all data
        todos_datos = obtener_logs()

        if todos_datos:
            df_todos = pd.DataFrame(todos_datos)

            # Metrics for all zones
            col1, col2, col3 = st.columns(3)
            with col1:
                temp_promedio_total = df_todos["temperatura"].mean()
                st.metric("🌡️ Temp. Promedio Global", f"{temp_promedio_total:.2f}°C")
            with col2:
                humedad_promedio_total = df_todos["humedad"].mean()
                st.metric("💧 Humedad Promedio Global", f"{humedad_promedio_total:.2f}%")
            with col3:
                cantidad_total = len(df_todos)
                st.metric("📊 Total de Lecturas", cantidad_total)

            # Comparative graph by zone
            st.subheader("📈 Comparativa de Temperaturas por Cultivo")
            if "timestamp" in df_todos.columns:
                df_todos["timestamp"] = pd.to_datetime(df_todos["timestamp"])

            fig_comp = go.Figure()
            for zona in zonas:
                df_zona = df_todos[df_todos["zona"] == zona].sort_values("timestamp")
                fig_comp.add_trace(go.Scatter(
                    x=df_zona["timestamp"],
                    y=df_zona["temperatura"],
                    mode="lines+markers",
                    name=f"{ICONOS.get(zona, '🌱')} {zona.capitalize()}",
                    line=dict(width=2),
                    marker=dict(size=5)
                ))

            fig_comp.update_layout(
                title="Evolución de Temperatura por Cultivo",
                xaxis_title="Timestamp",
                yaxis_title="Temperatura (°C)",
                hovermode="x unified",
                height=400
            )
            st.plotly_chart(fig_comp, use_container_width=True)

            # Data table for all zones
            st.subheader("📋 Datos de Todas las Zonas")
            columnas = ["sensor_id", "zona", "temperatura", "humedad", "timestamp", "topic", "qos"]
            df_mostrar_todos = df_todos[[col for col in columnas if col in df_todos.columns]]
            st.dataframe(df_mostrar_todos, use_container_width=True, height=400)
        else:
            st.info("Sin datos disponibles")


if __name__ == "__main__":
    main()
