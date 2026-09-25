import { prepareTrustedDwfxFileImport } from "./trusted-file-import.mjs";

function fileNameOf(file){
  return String(file?.name??"");
}

/**
 * Browser-facing controller for a user-selected DWFx File.
 *
 * It performs no DOM work. UI code can call this function and decide how to
 * display blockers or pass the returned TubeBenderProject package into the
 * existing project-open path.
 */
export async function importSelectedDwfxFile(
  file,
  {
    project_id="dwfx-project",
    project_name=null,
    bbox=null,
    prepareImport=prepareTrustedDwfxFileImport
  }={}
){
  if(typeof prepareImport!=="function"){
    throw new TypeError("prepareImport must be a function");
  }
  if(!file||typeof file.arrayBuffer!=="function"){
    throw new TypeError("A File-like object with arrayBuffer() is required");
  }

  const name=fileNameOf(file);
  if(!/\.dwfx$/i.test(name)){
    return Object.freeze({
      status:"blocked",
      stage:"file_type",
      editable_ready:false,
      production_ready:false,
      package:null,
      blocker:"Selected file is not a .dwfx package."
    });
  }

  const buffer=await file.arrayBuffer();
  const bytes=
    buffer instanceof Uint8Array
      ? buffer
      : buffer instanceof ArrayBuffer
        ? new Uint8Array(buffer)
        : ArrayBuffer.isView(buffer)
          ? new Uint8Array(buffer.buffer,buffer.byteOffset,buffer.byteLength)
          : null;

  if(!bytes){
    throw new TypeError("file.arrayBuffer() did not return binary data");
  }
  if(bytes.length===0){
    return Object.freeze({
      status:"blocked",
      stage:"file_read",
      editable_ready:false,
      production_ready:false,
      package:null,
      blocker:"Selected DWFx file is empty."
    });
  }

  const result=await prepareImport({
    bytes,
    dwfx_file:name,
    project_id,
    project_name:project_name??name.replace(/\.dwfx$/i,""),
    bbox
  });

  const bboxStatus=
    result?.project_import?.project_package?.bbox_status ??
    (result?.package?.project?.bbox ? "exact_explicit" : null);

  if(
    result?.status==="dwfx_project_candidate" &&
    bboxStatus==="unresolved"
  ){
    return Object.freeze({
      status:"requirements_pending",
      stage:"project_bbox",
      editable_ready:false,
      production_ready:false,
      requirement:Object.freeze({
        kind:"bbox",
        unit:"mm",
        axes:Object.freeze(["x","y","z"]),
        reason:"Project corpus dimensions are required explicitly before opening DWFx geometry."
      }),
      preliminary_result:result,
      package:null,
      blocker:"DWFx geometry is recognized, but project bbox dimensions must be entered explicitly before the project can be opened."
    });
  }

  return result;
}
