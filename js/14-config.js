// ════════════════════════════════════════════════════════════════════
// ◆  14-config.js — Config
// ════════════════════════════════════════════════════════════════════

function Config({productos,setProductos,clientes,setClientes,ventas,setVentas,planillas,setPlanillas,stock,setStock,cargasDia,setCargasDia,syncData,onVolver,negocioId}) {
  const [tab,setTab]=useState("stock");
  const [editandoId,setEditandoId]=useState(null);
  const [importando,setImportando]=useState(false);
  const [mantVeh,setMantVeh] = React.useState(()=>{try{return JSON.parse(localStorage.getItem("cat_mant_vehiculo_v1")||"[]");}catch{return [];}});
  const [mostrarNuevoMant,setMostrarNuevoMant] = React.useState(false);
  const saveMantVeh = (lista) => {setMantVeh(lista);localStorage.setItem("cat_mant_vehiculo_v1",JSON.stringify(lista));if(syncData)syncData({mantVeh:lista});};
  const prestados={sifon:clientes.reduce((a,c)=>a+(c.sifon||0),0),bidon10:clientes.reduce((a,c)=>a+(c.bidon10||0),0),bidon20:clientes.reduce((a,c)=>a+(c.bidon20||0),0)};
  const stockKeys={"Sifón 1.5L":"sifon","Bidón 10L":"bidon10","Bidón 20L":"bidon20","Dispenser":"dispenser"};
  return (
    <div style={s.screen}>
      <div style={s.header}><button style={s.backBtn} onClick={onVolver}>← Volver</button><span style={s.headerTitle}>Configuración</span></div>
      <div style={{padding:"14px 14px 6px",background:"var(--color-background-secondary)"}}>
        {[
          [["stock","📦","Stock"],["cargas","🚚","Cargas"],["historial","📋","Historial"],["backup","💾","Backup"]],
          [["vehiculo","🚐","Vehículo"],["apariencia","🎨","Estilo"],["equipo","👥","Equipo"],["vincular","🔗","Vincular"]],
        ].map((fila,fi)=>(
          <div key={fi} style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8}}>
            {fila.map(([id,ico,lbl])=>(
              <button key={id} onClick={()=>setTab(id)} style={{
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,
                padding:"12px 6px",borderRadius:12,cursor:"pointer",
                border:`2px solid ${tab===id?"var(--color-accent)":"transparent"}`,
                background:tab===id?"var(--color-background-secondary)":"var(--color-background-tertiary)",
                boxShadow:tab===id
                  ?"0 0 0 1px var(--color-accent), 0 4px 12px rgba(24,95,165,0.3)"
                  :"0 3px 6px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.06) inset",
                color:tab===id?"var(--color-accent)":"var(--color-text-secondary)",
                transition:"all 0.15s",
              }}>
                <span style={{fontSize:20}}>{ico}</span>
                <span style={{fontSize:10,fontWeight:tab===id?600:400,letterSpacing:"0.02em"}}>{lbl}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      {tab==="stock"&&(<>
        <div style={{padding:16}}>
          <div style={{...s.card,margin:"0 0 14px",background:"var(--color-background-info)",border:"0.5px solid var(--color-border-info)",padding:"10px 14px"}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--color-text-info)"}}>💲 Precios y costos</span>
          </div>
          
        {/* Lista de artículos */}
        {productos.map(p=>{
          const editing = editandoId===p.id;
          const [pr,setPr] = [p.precio, v=>setProductos(productos.map(x=>x.id===p.id?{...x,precio:Number(v)||0}:x))];
          const [co,setCo] = [p.costo, v=>setProductos(productos.map(x=>x.id===p.id?{...x,costo:Number(v)||0}:x))];
          const margen = p.precio>0?Math.round(((p.precio-p.costo)/p.precio)*100):0;
          return (
            <div key={p.id} style={{...s.card,margin:"0 0 10px",borderLeft:editing?"3px solid #185FA5":"0.5px solid var(--color-border-tertiary)"}}>
              {!editing?(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)"}}>{p.nombre}</div>
                    <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:4}}>
                      Venta: <b>{fmt(p.precio)}</b> · Costo: {fmt(p.costo)} · 
                      <span style={{color:margen>40?"var(--color-text-success)":margen>20?"var(--color-text-warning)":"var(--color-text-danger)"}}> {margen}% margen</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button style={{...s.btn,fontSize:11,padding:"4px 10px"}} onClick={()=>setEditandoId(p.id)}>Editar</button>
                    <button style={s.btnDanger} onClick={()=>{if(window.confirm(`¿Eliminar "${p.nombre}"?`))setProductos(productos.filter(x=>x.id!==p.id));}}>✕</button>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Editando: {p.nombre}</span>
                    <button style={{...s.btn,fontSize:11,padding:"3px 10px"}} onClick={()=>setEditandoId(null)}>Cancelar</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <div>
                      <label style={s.label}>Nombre</label>
                      <input style={s.input} defaultValue={p.nombre} id={`nm-${p.id}`} />
                    </div>
                    <div>
                      <label style={s.label}>Precio de venta $</label>
                      <input style={s.inputNum} type="number" defaultValue={p.precio} id={`pr-${p.id}`} />
                    </div>
                    <div>
                      <label style={s.label}>Costo de llenado $</label>
                      <input style={s.inputNum} type="number" defaultValue={p.costo} id={`co-${p.id}`} />
                    </div>
                    <div>
                      <label style={s.label}>Unidad (ej: 1.5L)</label>
                      <input style={s.input} defaultValue={p.unidad||""} id={`un-${p.id}`} placeholder="opcional" />
                    </div>
                  </div>
                  <button style={s.btnPrimary} onClick={()=>{
                    const nm=document.getElementById(`nm-${p.id}`).value;
                    const pr=Number(document.getElementById(`pr-${p.id}`).value);
                    const co=Number(document.getElementById(`co-${p.id}`).value);
                    const un=document.getElementById(`un-${p.id}`).value;
                    setProductos(productos.map(x=>x.id===p.id?{...x,nombre:nm,precio:pr,costo:co,unidad:un}:x));
                    setEditandoId(null);
                  }}>Guardar</button>
                </div>
              )}
            </div>
          );
        })}

        {/* Agregar nuevo artículo */}
        {editandoId==="nuevo"?(
          <div style={{...s.card,margin:"0 0 12px",borderLeft:"3px solid #4dd9a0"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:14,fontWeight:500,color:"#4dd9a0"}}>Nuevo artículo</span>
              <button style={{...s.btn,fontSize:11,padding:"3px 10px"}} onClick={()=>setEditandoId(null)}>Cancelar</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div><label style={s.label}>Nombre</label><input style={s.input} id="nm-nuevo" placeholder="Ej: Bidón 20L" /></div>
              <div><label style={s.label}>Precio de venta $</label><input style={s.inputNum} type="number" id="pr-nuevo" placeholder="0" /></div>
              <div><label style={s.label}>Costo de llenado $</label><input style={s.inputNum} type="number" id="co-nuevo" placeholder="0" /></div>
              <div><label style={s.label}>Unidad</label><input style={s.input} id="un-nuevo" placeholder="ej: 20L" /></div>
            </div>
            <button style={{...s.btnPrimary,background:"#0F6E56"}} onClick={()=>{
              const nm=document.getElementById("nm-nuevo").value.trim();
              if(!nm) return;
              const pr=Number(document.getElementById("pr-nuevo").value)||0;
              const co=Number(document.getElementById("co-nuevo").value)||0;
              const un=document.getElementById("un-nuevo").value;
              setProductos([...productos,{id:Date.now(),nombre:nm,precio:pr,costo:co,unidad:un}]);
              setEditandoId(null);
            }}>+ Agregar artículo</button>
          </div>
        ):(
          <button style={{...s.btn,width:"100%",padding:"10px",fontSize:13,marginBottom:16,borderStyle:"dashed"}}
            onClick={()=>setEditandoId("nuevo")}>+ Agregar nuevo artículo</button>
        )}

        {/* Calculadora de costo real */}
        <CalculadoraCostoReal productos={productos} ventas={ventas} />

        </div>
        <div style={{padding:"0 16px 16px"}}>
          <div style={{...s.card,margin:"0 0 14px",background:"var(--color-background-info)",border:"0.5px solid var(--color-border-info)",padding:"10px 14px"}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--color-text-info)"}}>📦 Stock en depósito</span>
          </div>
          
            <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:16,lineHeight:1.6}}>
              Control de stock en los 3 lugares. Al iniciar reparto el camión se carga desde la sodería automáticamente.
            </p>
            {[["soderia","🏭 Sodería"],["casa","🏠 Casa"],["camion","🚚 Camión"]].map(([lugar,titulo])=>(
              <div key={lugar} style={{...s.card,margin:"0 0 12px"}}>
                <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:10}}>{titulo}</div>
                <div style={s.grid3}>
                  {[["sifon","Sifón"],["bidon10","Bidón 10L"],["bidon20","Bidón 20L"]].map(([k,l])=>(
                    <div key={k}>
                      <label style={{...s.label,textAlign:"center"}}>{l}</label>
                      <input style={{...s.inputNum,textAlign:"center"}} type="number" min={0}
                        value={stock?.[lugar]?.[k]??0}
                        onChange={e=>{
                          const ns=JSON.parse(JSON.stringify(stock||{}));
                          if(!ns[lugar]) ns[lugar]={sifon:0,bidon10:0,bidon20:0};
                          ns[lugar][k]=Number(e.target.value)||0;
                          setStock(ns);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button style={s.btnPrimary} onClick={()=>{syncData({stock});alert("Stock guardado");}}>Guardar stock</button>
        </div>
      </>)}
        {tab==="historial"&&(
          <CargaHistorica
            clientes={clientes}
            productos={productos}
            onGuardar={(vts)=>{const nv=[...(ventas||[]),...vts];setVentas(nv);if(syncData)syncData({ventas:nv});}}
            onVolver={null}
            enConfig={true}
          />
        )}
        {tab==="backup"&&(
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{...s.card,margin:0,background:"var(--color-background-info)",border:"0.5px solid var(--color-border-info)",padding:"10px 14px",marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--color-text-info)"}}>📥 Importar clientes</span>
          </div>
          
          <div style={{...s.card,margin:0,borderLeft:"3px solid #185FA5"}}>
            <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)",marginBottom:6}}>📥 Importar clientes desde planilla Excel</div>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:10,lineHeight:1.6}}>
              Usá la planilla oficial <b>planilla_clientes_SR2026.xlsx</b> para cargar tus clientes en bloque. Los clientes importados se agregan a los existentes.
            </div>
            <div style={{...s.card,margin:"0 0 10px",background:"var(--color-background-tertiary)",padding:"10px 12px"}}>
              <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-warning)",marginBottom:6}}>⚠️ Antes de importar</div>
              <div style={{fontSize:11,color:"var(--color-text-secondary)",lineHeight:1.7}}>
                • Completá la planilla con los datos de tus clientes<br/>
                • Verificá que los días de reparto sean válidos<br/>
                • Cada cliente debe tener nombre, día y número de orden<br/>
                • El saldo negativo significa que el cliente debe dinero
              </div>
            </div>
            <input
              type="file" accept=".xlsx"
              style={{...s.input,marginBottom:10,padding:"8px",fontSize:13}}
              onChange={e=>{
                const f = e.target.files[0];
                if(f) importarClientesPlanilla(f, clientes, (nuevos)=>{ setClientes(nuevos); syncData({clientes:nuevos}); });
                e.target.value="";
              }}
            />
            <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Solo archivos .xlsx — usa la planilla oficial del sistema</div>
          </div>

          {/* Resumen de clientes actuales */}
          {clientes.length > 0 && (
            <div style={{...s.card,margin:0}}>
              <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:8}}>
                👥 Clientes actuales: <b>{clientes.length}</b>
              </div>
              {["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"].map(d=>{
                const n = clientes.filter(c=>c.dia===d).length;
                if(!n) return null;
                return (
                  <div key={d} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                    <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{d}</span>
                    <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{n} clientes</span>
                  </div>
                );
              })}
              <button style={{...s.btnDanger,width:"100%",marginTop:10,fontSize:12}} onClick={()=>{
                if(window.confirm(`¿Eliminar TODOS los ${clientes.length} clientes? Esta acción no se puede deshacer.`)){
                  setClientes([]); syncData({clientes:[]});
                }
              }}>🗑 Borrar todos los clientes</button>
            </div>
          )}
          <div style={{...s.card,margin:0,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-secondary)",padding:"10px 14px",marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--color-text-primary)"}}>💾 Backup y sincronización</span>
          </div>
          
          {/* RECUPERACION DE EMERGENCIA */}
          {(()=>{
            const backupKeys = Object.keys(localStorage).filter(k=>k.startsWith("lc_backup_")).sort().reverse();
            if(backupKeys.length===0) return null;
            return (
              <div style={{...s.card,margin:0,borderLeft:"3px solid #4dd9a0",background:"#0a2e1f"}}>
                <div style={{fontSize:14,fontWeight:600,color:"#4dd9a0",marginBottom:4}}>🔄 Recuperar clientes desde backup local</div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:10}}>Si perdiste clientes, podés restaurarlos desde un backup automático guardado en este dispositivo. <strong style={{color:"#f5b942"}}>Solo restaura los CLIENTES, sin tocar ventas ni planillas.</strong></div>
                {backupKeys.map(key=>{
                  let data=null;
                  try{data=JSON.parse(localStorage.getItem(key));}catch(e){}
                  if(!data) return null;
                  const fecha=key.replace("lc_backup_","");
                  const nClientes=(data.clientes||[]).length;
                  const diasConClientes=[...new Set((data.clientes||[]).map(c=>c.dia))].join(", ");
                  return (
                    <div key={key} style={{...s.card,margin:"0 0 8px",background:"var(--color-background-tertiary)",padding:"10px 12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>📅 {fecha}</div>
                          <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:2}}>{nClientes} clientes · {diasConClientes||"sin días"}</div>
                        </div>
                        <button
                          style={{background:"#185FA5",color:"#e2eaf4",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:500,cursor:"pointer"}}
                          onClick={()=>{
                            if(window.confirm(`¿Restaurar ${nClientes} clientes desde el backup del ${fecha}?\n\nEsto reemplaza los clientes actuales (${clientes.length}) con los del backup.\nVentas y planillas NO se tocan.`)){
                              setClientes(data.clientes||[]);
                              syncData({clientes:data.clientes||[]});
                              alert(`✅ ${nClientes} clientes restaurados desde ${fecha}`);
                            }
                          }}>
                          Restaurar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div style={{...s.card,margin:0,background:"var(--color-background-secondary)"}}>
            <div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.7}}>Los datos se guardan en el teléfono. Hacé un backup periódico para no perderlos si cambiás de dispositivo o borrás el navegador.</div>
          </div>
          <div style={{...s.card,margin:0}}>
            <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:8}}>💾 Espacio utilizado</div>
            {(()=>{
              let total=0;
              try{for(let k in localStorage){if(localStorage.hasOwnProperty(k)){total+=((localStorage[k]||'').length*2);}}}catch(e){}
              const kb=Math.round(total/1024);
              const pct=Math.min(100,Math.round(kb/5120*100));
              const color=pct>80?"#e05c5c":pct>50?"#f5b942":"#4dd9a0";
              const fotos=clientes.filter(c=>c.foto&&c.foto.startsWith('data:')).length;
              return (
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{kb} KB de ~5.000 KB</span>
                    <span style={{fontSize:13,fontWeight:600,color}}>{pct}%</span>
                  </div>
                  <div style={{height:8,background:"var(--color-background-tertiary)",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:pct+"%",background:color,borderRadius:4,transition:"width 0.3s"}} />
                  </div>
                  {fotos>0&&<div style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:6}}>📷 {fotos} fotos de domicilios guardadas</div>}
                  {pct>70&&<div style={{fontSize:12,color:"#e05c5c",marginTop:8}}>⚠️ Espacio alto. Eliminá fotos si la app deja de funcionar.</div>}
                </div>
              );
            })()}
          </div>
          <div style={{...s.card,margin:0}}>
            <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>📥 Exportar backup</div>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:10}}>Descarga un Excel con clientes, ventas, planillas y saldos.</div>
            <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:12}}>Clientes: {clientes.length} · Ventas: {ventas.length} · Planillas: {Object.keys(planillas).length}</div>
            <button style={s.btnPrimary} onClick={()=>exportarExcel(clientes,ventas,productos,planillas)}>Descargar Excel</button>
          </div>
          <div style={{...s.card,margin:0,borderLeft:"3px solid #EF9F27"}}>
            <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>🔄 Forzar sincronización</div>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:12}}>Si en un dispositivo no aparecen los clientes, usá este botón desde el dispositivo donde SÍ se ven bien. Sube todos los datos actuales a la nube y los demás dispositivos los van a recibir al reabrir la app.</div>
            <button style={{...s.btn,width:"100%",padding:"12px",fontSize:14,background:"#EF9F27",color:"#fff",border:"none"}} onClick={()=>{
              if(window.confirm("¿Subir todos los datos actuales a la nube? Esto va a sobreescribir lo que haya guardado.")){
                cloudSave({clientes,ventas,planillas,stock,productos,noVisitas:(noVisitas||[]),prospectos:(prospectos||[])}, uid, negocioId)
                  .then(()=>alert("✅ Datos sincronizados. Cerrá y volvé a abrir la app en el otro dispositivo."))
                  .catch(()=>alert("❌ Error al sincronizar. Verificá tu conexión."));
              }
            }}>Subir datos a la nube ahora</button>
          </div>
          <div style={{...s.card,margin:0}}>
            <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>📤 Importar backup</div>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:12}}>Restaura datos desde un Excel generado por esta app. Reemplaza todo lo actual.</div>
            {!importando
              ?<button style={{...s.btn,width:"100%",padding:"12px",fontSize:14}} onClick={()=>setImportando(true)}>Seleccionar archivo Excel</button>
              :<div>
                <input type="file" accept=".xlsx" style={{...s.input,marginBottom:8,padding:"6px"}} onChange={e=>{if(e.target.files[0]){if(window.confirm("¿Reemplazar todos los datos con el backup?")){importarBackup(e.target.files[0],setClientes,setVentas,setPlanillas);}setImportando(false);}}} />
                <button style={{...s.btn,width:"100%"}} onClick={()=>setImportando(false)}>Cancelar</button>
              </div>
            }
          </div>
        </div>
        )}
      {tab==="vehiculo"&&(
        <div style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:"var(--color-text-primary)"}}>🔧 Mantenimiento del vehículo</div>
              <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:2}}>Historial de service y reparaciones</div>
            </div>
            <button style={{...s.btnPrimary,padding:"8px 14px",fontSize:13}} onClick={()=>setMostrarNuevoMant(true)}>+ Registrar</button>
          </div>
          {mantVeh.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:"var(--color-text-tertiary)"}}>
              <div style={{fontSize:40,marginBottom:10}}>🚐</div>
              <div style={{fontSize:14}}>Sin registros aún</div>
              <div style={{fontSize:12,marginTop:6}}>Registrá cambios de aceite, service y reparaciones</div>
            </div>
          )}
          {[...mantVeh].reverse().map((m,i)=>(
            <div key={i} style={{...s.card,margin:"0 0 10px",borderLeft:`3px solid ${m.tipo==="aceite"?"#f5b942":m.tipo==="preventivo"?"#4dd9a0":m.tipo==="embrague"?"#e05c5c":m.tipo==="reparacion"?"#5daaff":"#a0aec0"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)"}}>
                    {m.tipo==="aceite"?"🛢 Cambio de aceite":m.tipo==="preventivo"?"🔩 Mantenimiento preventivo":m.tipo==="embrague"?"⚙️ Cambio de embrague":m.tipo==="reparacion"?"🛠 Reparación":"📋 "+m.tipo}
                  </div>
                  {m.descripcion&&<div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:4}}>{m.descripcion}</div>}
                  <div style={{display:"flex",gap:12,marginTop:6,flexWrap:"wrap"}}>
                    {m.km&&<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>📊 {Number(m.km).toLocaleString("es-AR")} km</span>}
                    {m.costo&&<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>💰 ${Number(m.costo).toLocaleString("es-AR")}</span>}
                  </div>
                  {m.proximo&&<div style={{fontSize:12,color:"#f5b942",marginTop:4,borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:4}}>⏰ Próximo: {m.proximo}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,marginLeft:10,flexShrink:0}}>
                  <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{m.fecha}</span>
                  <button style={{background:"#3a2020",color:"#e05c5c",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}
                    onClick={()=>saveMantVeh(mantVeh.filter((_,j)=>mantVeh.length-1-j!==i))}>Borrar</button>
                </div>
              </div>
            </div>
          ))}
          {mostrarNuevoMant&&(
            <VehiculoMantModal
              onGuardar={(reg)=>{saveMantVeh([...mantVeh,reg]);setMostrarNuevoMant(false);}}
              onCerrar={()=>setMostrarNuevoMant(false)}
            />
          )}
        </div>
      )}
      {tab==="apariencia"&&(
        <div style={{padding:16}}>
          <ConfigApariencia />
        </div>
      )}
      {tab==="equipo"&&(
        <div style={{padding:16}}>
          <RepartidoresPanel negocioId={negocioId} clientes={clientes} />
        </div>
      )}
      {tab==="vincular"&&(
        <div style={{padding:16}}>
          <VincularEmmaControl />

          {/* Soporte y contacto */}
          <div style={{...s.card,margin:"16px 0 0",background:"var(--color-background-secondary)"}}>
            <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)",marginBottom:4}}>
              💬 Soporte técnico
            </div>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:14,lineHeight:1.6}}>
              ¿Tenés algún problema o consulta? Escribinos por WhatsApp y te respondemos a la brevedad.
            </div>
            <a href="https://wa.me/5493813399962?text=Hola%2C+necesito+ayuda+con+Sistema+de+Reparto"
              target="_blank" rel="noopener"
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                padding:"13px",borderRadius:10,background:"#0a2e1f",
                border:"1px solid #4dd9a0",color:"#4dd9a0",
                fontSize:14,fontWeight:600,textDecoration:"none"}}>
              💬 Abrir WhatsApp
            </a>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:8,textAlign:"center"}}>
              Emma Soluciones Digitales · +54 9 381 339-9962
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

